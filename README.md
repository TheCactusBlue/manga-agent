# manga-agent

An AI-powered comic story generator that creates detailed comic stories with visual descriptions and generates images using Flux AI models.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your API keys:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude
   - `REPLICATE_API_TOKEN`: Your Replicate API token for Flux image generation

## Usage

Start the comic generator:
```bash
pnpm start
```

Follow the interactive prompts:
1. Enter your comic story prompt (e.g., "A superhero saves a cat from a tree")
2. Choose the number of panels (1-12, default: 4)
3. Wait for the AI to generate your comic story and images

## Output

Generated comics are saved to `.workspace/comics/` with:
- `story.json`: Complete story structure with characters and panels
- `panel-{id}.json`: Detailed panel descriptions with visual prompts
- `result.json`: Full generation result with metadata
- Images saved to `.workspace/images/`

## Scripts

- `pnpm start`: Run the comic generator
- `pnpm test`: Run tests (placeholder)

## License

MIT