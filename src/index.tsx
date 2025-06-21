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

interface PromptInputProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

function PromptInput({ currentInput, onInputChange, onSubmit }: PromptInputProps) {
  return (
    <Box flexDirection="column">
      <Text>Enter your prompt:</Text>
      <Box borderStyle="single" paddingX={1}>
        <TextInput
          value={currentInput}
          placeholder="e.g., Show the character working on a laptop..."
          onChange={onInputChange}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}

interface ImageUrlInputProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

function ImageUrlInput({ currentInput, onInputChange, onSubmit }: ImageUrlInputProps) {
  return (
    <Box flexDirection="column">
      <Text>Enter image URL:</Text>
      <Box borderStyle="single" paddingX={1}>
        <TextInput
          value={currentInput}
          placeholder="https://example.com/image.jpg"
          onChange={onInputChange}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}

interface ProcessingViewProps {
  prompt: string;
  imageUrl?: string;
}

function ProcessingView({ prompt, imageUrl }: ProcessingViewProps) {
  return (
    <Box flexDirection="column">
      <Text>Processing your request...</Text>
      <Text dimColor>Prompt: {prompt}</Text>
      <Text dimColor>Image: {imageUrl}</Text>
    </Box>
  );
}

interface DoneViewProps {
  error?: string;
  output?: string;
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

function DoneView({ error, output, currentInput, onInputChange, onSubmit }: DoneViewProps) {
  return (
    <Box flexDirection="column">
      {error ? (
        <Text color="red">Error: {error}</Text>
      ) : (
        <>
          <Text color="green">✅ Image generated successfully!</Text>
          <Text>Output URL: {output}</Text>
          <Text dimColor>Press Enter to generate another image...</Text>
          <Box borderStyle="single" paddingX={1}>
            <TextInput
              value={currentInput}
              placeholder="Enter new prompt..."
              onChange={onInputChange}
              onSubmit={onSubmit}
            />
          </Box>
        </>
      )}
    </Box>
  );
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
            "black-forest-labs/flux-kontext-max",
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

  const handleInputChange = (value: string) => {
    setState((prev) => ({ ...prev, currentInput: value }));
  };

  const handleDoneSubmit = (value: string) => {
    setState((prev) => ({
      ...prev,
      prompt: value,
      step: "processing",
      currentInput: "",
      generationCount: prev.generationCount + 1,
      imageUrl: prev.previousOutput,
    }));
  };

  if (state.step === "prompt") {
    return (
      <PromptInput
        currentInput={state.currentInput}
        onInputChange={handleInputChange}
        onSubmit={handlePromptSubmit}
      />
    );
  }

  if (state.step === "image") {
    return (
      <ImageUrlInput
        currentInput={state.currentInput}
        onInputChange={handleInputChange}
        onSubmit={handleImageSubmit}
      />
    );
  }

  if (state.step === "processing") {
    return (
      <ProcessingView
        prompt={state.prompt}
        imageUrl={state.imageUrl}
      />
    );
  }

  if (state.step === "done") {
    return (
      <DoneView
        error={state.error}
        output={state.output}
        currentInput={state.currentInput}
        onInputChange={handleInputChange}
        onSubmit={handleDoneSubmit}
      />
    );
  }

  return null;
}

render(<App />);
