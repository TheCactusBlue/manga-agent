import { z } from "zod";

export const ComicPanelSchema = z.object({
  id: z.number(),
  description: z.string().describe("Detailed description of what happens in this panel"),
  characters: z.array(z.string()).describe("List of characters appearing in this panel"),
  setting: z.string().describe("Location or setting where the panel takes place"),
  dialogue: z.array(z.object({
    character: z.string(),
    text: z.string()
  })).optional().describe("Dialogue spoken by characters in this panel"),
  visualStyle: z.string().describe("Visual style and mood for the panel (e.g., 'dramatic close-up', 'wide establishing shot')"),
  imagePrompt: z.string().describe("Detailed prompt for image generation optimized for Flux")
});

export const ComicStorySchema = z.object({
  title: z.string().describe("Title of the comic story"),
  genre: z.string().describe("Genre of the comic (e.g., superhero, slice-of-life, adventure)"),
  theme: z.string().describe("Main theme or message of the story"),
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    visualDescription: z.string().describe("Physical appearance for consistent character generation")
  })).describe("Main characters in the story"),
  panels: z.array(ComicPanelSchema).describe("Sequential panels that make up the comic story"),
  artStyle: z.string().describe("Overall art style for the comic (e.g., 'manga style', 'western comic book', 'watercolor illustration')")
});

export const ComicGenerationRequestSchema = z.object({
  prompt: z.string().describe("User's original prompt for the comic"),
  panelCount: z.number().min(1).max(12).default(4).describe("Number of panels to generate"),
  artStyle: z.string().optional().describe("Preferred art style for the comic"),
  genre: z.string().optional().describe("Preferred genre for the comic")
});

export const ComicGenerationResultSchema = z.object({
  story: ComicStorySchema,
  generatedImages: z.array(z.object({
    panelId: z.number(),
    imageUrl: z.string().describe("Status or description of generated content"),
    imagePath: z.string().describe("Local path where the panel data is saved")
  })),
  metadata: z.object({
    generatedAt: z.string(),
    totalPanels: z.number(),
    processingTimeMs: z.number()
  })
});

export type ComicPanel = z.infer<typeof ComicPanelSchema>;
export type ComicStory = z.infer<typeof ComicStorySchema>;
export type ComicGenerationRequest = z.infer<typeof ComicGenerationRequestSchema>;
export type ComicGenerationResult = z.infer<typeof ComicGenerationResultSchema>;