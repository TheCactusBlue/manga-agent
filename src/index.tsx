import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import TextInput from "ink-text-input";
import Replicate from "replicate";
import "dotenv/config";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface AppState {
  step: "prompt" | "image" | "processing" | "done";
  prompt: string;
  imageUrl?: string;
  currentInput: string;
  output?: string;
  error?: string;
  generationCount: number;
  previousOutput?: string;
}

function App() {
  const [state, setState] = useState<AppState>({
    step: "prompt",
    prompt: "",
    imageUrl: undefined,
    currentInput: "",
    generationCount: 0,
    previousOutput: undefined,
  });

  const handlePromptSubmit = (value: string) => {
    setState((prev) => ({
      ...prev,
      prompt: value,
      step: prev.generationCount === 0 ? "processing" : "image",
      currentInput: "",
      generationCount: prev.generationCount + 1,
      imageUrl: prev.generationCount > 0 ? prev.previousOutput : undefined,
    }));
  };

  const handleImageSubmit = (value: string) => {
    setState((prev) => ({ ...prev, imageUrl: value, step: "processing" }));
  };

  useEffect(() => {
    if (state.step === "processing") {
      const processImage = async () => {
        try {
          const input = {
            prompt: state.prompt,
            input_image: state.imageUrl,
            aspect_ratio: "match_input_image",
            output_format: "jpg",
            safety_tolerance: 6,
          };

          const output = (await replicate.run(
            "black-forest-labs/flux-kontext-pro",
            {
              input,
            },
          )) as any;

          setState((prev) => ({
            ...prev,
            step: "done",
            output: output.url().href,
            previousOutput: output.url().href,
          }));
        } catch (error) {
          setState((prev) => ({
            ...prev,
            step: "done",
            error: error instanceof Error ? error.message : "Unknown error",
          }));
        }
      };

      processImage();
    }
  }, [state.step, state.prompt, state.imageUrl]);

  if (state.step === "prompt") {
    return (
      <Box flexDirection="column">
        <Text>Enter your prompt:</Text>
        <TextInput
          value={state.currentInput}
          placeholder="e.g., Show the character working on a laptop..."
          onChange={(value) =>
            setState((prev) => ({ ...prev, currentInput: value }))
          }
          onSubmit={handlePromptSubmit}
        />
      </Box>
    );
  }

  if (state.step === "image") {
    return (
      <Box flexDirection="column">
        <Text>Enter image URL:</Text>
        <TextInput
          value={state.currentInput}
          placeholder="https://example.com/image.jpg"
          onChange={(value) =>
            setState((prev) => ({ ...prev, currentInput: value }))
          }
          onSubmit={handleImageSubmit}
        />
      </Box>
    );
  }

  if (state.step === "processing") {
    return (
      <Box flexDirection="column">
        <Text>Processing your request...</Text>
        <Text dimColor>Prompt: {state.prompt}</Text>
        <Text dimColor>Image: {state.imageUrl}</Text>
      </Box>
    );
  }

  if (state.step === "done") {
    return (
      <Box flexDirection="column">
        {state.error ? (
          <Text color="red">Error: {state.error}</Text>
        ) : (
          <>
            <Text color="green">✅ Image generated successfully!</Text>
            <Text>Output URL: {state.output}</Text>
            <Text dimColor>Press Enter to generate another image...</Text>
            <TextInput
              value={state.currentInput}
              placeholder="Enter new prompt..."
              onChange={(value) =>
                setState((prev) => ({ ...prev, currentInput: value }))
              }
              onSubmit={(value) => {
                setState((prev) => ({
                  ...prev,
                  prompt: value,
                  step: "processing",
                  currentInput: "",
                  generationCount: prev.generationCount + 1,
                  imageUrl: prev.previousOutput,
                }));
              }}
            />
          </>
        )}
      </Box>
    );
  }

  return null;
}

render(<App />);
