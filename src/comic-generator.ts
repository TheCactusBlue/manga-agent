import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import Replicate from "replicate";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";
import { 
  ComicGenerationRequest, 
  ComicGenerationResult, 
  ComicStorySchema, 
  ComicPanel 
} from "./schema.js";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function ensureWorkspaceDirectory(): Promise<string> {
  const workspaceDir = path.join(process.cwd(), ".workspace");
  const comicsDir = path.join(workspaceDir, "comics");
  const imagesDir = path.join(workspaceDir, "images");
  
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  if (!fs.existsSync(comicsDir)) {
    fs.mkdirSync(comicsDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  return workspaceDir;
}

async function generateDetailedImageDescription(panel: ComicPanel, story: { artStyle: string }): Promise<string> {
  const result = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: `You are an expert manga artist and illustrator. Create extremely detailed visual descriptions for comic panels that could be used as prompts for AI image generation. Focus on:
- Specific visual details, composition, and framing
- Character positioning and expressions
- Environmental details and atmosphere
- Art style elements and rendering techniques
- Color palette suggestions
- Lighting and shadows`,
    prompt: `Create a detailed visual description for this comic panel:

Panel Description: ${panel.description}
Characters: ${panel.characters.join(", ")}
Setting: ${panel.setting}
Visual Style: ${panel.visualStyle}
Art Style: ${story.artStyle}
Original Image Prompt: ${panel.imagePrompt}

Provide a comprehensive visual description that an artist could use to create this panel, including specific details about composition, character poses, expressions, background elements, and artistic techniques.`
  });
  
  return result.text;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function generateImageWithFlux(prompt: string, panelId: string, imagesDir: string): Promise<string> {
  try {
    console.log(`   🎨 Generating image with Flux for panel ${panelId}...`);
    
    const output = (await replicate.run(
      "black-forest-labs/flux-kontext-max",
      {
        input: {
          prompt: prompt,
          aspect_ratio: "16:9",
          output_format: "jpg",
          output_quality: 90,
          safety_tolerance: 2
        }
      }
    ) as any).url().href;
    
    if (!output || typeof output !== 'string') {
      throw new Error('Invalid output from Replicate API');
    }
    
    const imageUrl = output as string;
    const filename = `panel-${panelId}.jpg`;
    const filepath = path.join(imagesDir, filename);
    
    console.log(`   📥 Downloading image for panel ${panelId}...`);
    await downloadImage(imageUrl, filepath);
    
    console.log(`   ✅ Image saved: ${filename}`);
    return filepath;
    
  } catch (error) {
    console.error(`   ❌ Failed to generate image for panel ${panelId}:`, error);
    throw error;
  }
}

async function generateComicStory(request: ComicGenerationRequest) {
  const systemPrompt = `You are a professional comic writer and story designer. Create engaging comic stories with well-developed characters, compelling narratives, and detailed visual descriptions.

Consider the following when creating the story:
- Each panel should advance the story meaningfully
- Character descriptions should be consistent and detailed for image generation
- Visual prompts should be specific and optimized for AI image generation
- Include varied shot types and compositions for visual interest
- Ensure dialogue flows naturally and serves the story`;

  const userPrompt = `Create a ${request.panelCount}-panel comic story based on this prompt: "${request.prompt}"

${request.genre ? `Genre: ${request.genre}` : ""}
${request.artStyle ? `Art Style: ${request.artStyle}` : ""}

Focus on creating:
1. A compelling story arc that fits the panel count
2. Consistent character designs with detailed visual descriptions
3. Varied and dynamic panel compositions
4. Clear, engaging dialogue when appropriate
5. Detailed image prompts optimized for Flux image generation`;

  const result = await generateObject({
    model: anthropic("claude-3-5-sonnet-20241022"),
    schema: ComicStorySchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.object;
}

async function createPanelFile(panel: ComicPanel, story: { artStyle: string }, panelDir: string): Promise<string> {
  const detailedDescription = await generateDetailedImageDescription(panel, story);
  
  const panelData = {
    id: panel.id,
    description: panel.description,
    characters: panel.characters,
    setting: panel.setting,
    dialogue: panel.dialogue,
    visualStyle: panel.visualStyle,
    imagePrompt: panel.imagePrompt,
    detailedVisualDescription: detailedDescription,
    artStyle: story.artStyle
  };
  
  const filePath = path.join(panelDir, `panel-${panel.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(panelData, null, 2));
  
  return filePath;
}

export async function generateComic(request: ComicGenerationRequest): Promise<ComicGenerationResult> {
  const startTime = Date.now();
  const workspaceDir = await ensureWorkspaceDirectory();
  
  console.log("🎨 Generating comic story structure...");
  const story = await generateComicStory(request);
  
  console.log(`📚 Generated story: "${story.title}"`);
  console.log(`🎭 Characters: ${story.characters.map(c => c.name).join(", ")}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const comicDir = path.join(workspaceDir, "comics", `comic-${timestamp}`);
  fs.mkdirSync(comicDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(comicDir, "story.json"),
    JSON.stringify(story, null, 2)
  );
  
  console.log("🖼️  Generating images for panels...");
  const generatedImages = [];
  const imagesDir = path.join(workspaceDir, "images");
  
  for (let i = 0; i < story.panels.length; i++) {
    const panel = story.panels[i];
    console.log(`   Panel ${i + 1}/${story.panels.length}: ${panel.description}`);
    
    try {
      await createPanelFile(panel, story, comicDir);
      
      // Generate detailed prompt for image generation
      const detailedDescription = await generateDetailedImageDescription(panel, story);
      
      // Generate and download the image
      const imagePath = await generateImageWithFlux(detailedDescription, panel.id.toString(), imagesDir);
      
      generatedImages.push({
        panelId: panel.id,
        imageUrl: `file://${imagePath}`,
        imagePath: path.relative(process.cwd(), imagePath)
      });
      
      console.log(`   ✅ Panel ${panel.id} image generated and saved`);
    } catch (error) {
      console.error(`   ❌ Failed to generate panel ${panel.id}:`, error);
      throw error;
    }
  }
  
  const endTime = Date.now();
  const result: ComicGenerationResult = {
    story,
    generatedImages,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPanels: story.panels.length,
      processingTimeMs: endTime - startTime
    }
  };
  
  fs.writeFileSync(
    path.join(comicDir, "result.json"),
    JSON.stringify(result, null, 2)
  );
  
  console.log(`🎉 Comic generation complete! Saved to: ${path.relative(process.cwd(), comicDir)}`);
  console.log(`⏱️  Total processing time: ${(endTime - startTime) / 1000}s`);
  
  return result;
}