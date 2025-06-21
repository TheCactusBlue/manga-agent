import React, { useState, useEffect } from "react";
import { render, Text, Box } from "ink";
import TextInput from "ink-text-input";
import "dotenv/config";
import { generateComic } from "./comic-generator.js";
import type { ComicGenerationRequest, ComicGenerationResult } from "./schema.js";

interface AppState {
  step: "prompt" | "options" | "processing" | "done";
  prompt: string;
  currentInput: string;
  panelCount: number;
  artStyle?: string;
  genre?: string;
  result?: ComicGenerationResult;
  error?: string;
}

interface PromptInputProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

function PromptInput({ currentInput, onInputChange, onSubmit }: PromptInputProps) {
  return (
    <Box flexDirection="column">
      <Text color="cyan">🎨 Comic Generator</Text>
      <Text>Enter your comic prompt:</Text>
      <Box borderStyle="single" paddingX={1}>
        <TextInput
          value={currentInput}
          placeholder="e.g., A superhero saves a cat from a tree..."
          onChange={onInputChange}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}

interface OptionsInputProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
  prompt: string;
}

function OptionsInput({ currentInput, onInputChange, onSubmit, prompt }: OptionsInputProps) {
  return (
    <Box flexDirection="column">
      <Text color="green">Prompt: {prompt}</Text>
      <Text>Panel count (1-12, default 4):</Text>
      <Box borderStyle="single" paddingX={1}>
        <TextInput
          value={currentInput}
          placeholder="4"
          onChange={onInputChange}
          onSubmit={onSubmit}
        />
      </Box>
      <Text dimColor>Press Enter to continue with default options</Text>
    </Box>
  );
}

interface ProcessingViewProps {
  prompt: string;
  panelCount: number;
}

function ProcessingView({ prompt, panelCount }: ProcessingViewProps) {
  return (
    <Box flexDirection="column">
      <Text color="yellow">🔄 Generating your comic story and detailed panel descriptions...</Text>
      <Text dimColor>Prompt: {prompt}</Text>
      <Text dimColor>Panels: {panelCount}</Text>
      <Text dimColor>Creating structured story and detailed visual descriptions...</Text>
    </Box>
  );
}

interface DoneViewProps {
  error?: string;
  result?: ComicGenerationResult;
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

function DoneView({ error, result, currentInput, onInputChange, onSubmit }: DoneViewProps) {
  return (
    <Box flexDirection="column">
      {error ? (
        <Text color="red">❌ Error: {error}</Text>
      ) : result ? (
        <>
          <Text color="green">✅ Comic story and detailed descriptions generated!</Text>
          <Text color="cyan">Title: {result.story.title}</Text>
          <Text>Genre: {result.story.genre}</Text>
          <Text>Characters: {result.story.characters.map(c => c.name).join(", ")}</Text>
          <Text>Panels: {result.metadata.totalPanels}</Text>
          <Text>Processing time: {(result.metadata.processingTimeMs / 1000).toFixed(1)}s</Text>
          <Text dimColor>Story and panel descriptions saved to: .workspace/comics/</Text>
          
          <Text>Press Enter to generate another comic...</Text>
          <Box borderStyle="single" paddingX={1}>
            <TextInput
              value={currentInput}
              placeholder="Enter new prompt..."
              onChange={onInputChange}
              onSubmit={onSubmit}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

function App() {
  const [state, setState] = useState<AppState>({
    step: "prompt",
    prompt: "",
    currentInput: "",
    panelCount: 4,
  });

  const handlePromptSubmit = (value: string) => {
    setState(prev => ({
      ...prev,
      prompt: value,
      step: "options",
      currentInput: "",
    }));
  };

  const handleOptionsSubmit = (value: string) => {
    const panelCount = value.trim() ? parseInt(value.trim()) : 4;
    setState(prev => ({
      ...prev,
      panelCount: Math.max(1, Math.min(12, panelCount)),
      step: "processing",
      currentInput: "",
    }));
  };

  useEffect(() => {
    if (state.step === "processing") {
      const processComic = async () => {
        try {
          const request: ComicGenerationRequest = {
            prompt: state.prompt,
            panelCount: state.panelCount,
            artStyle: state.artStyle,
            genre: state.genre,
          };

          const result = await generateComic(request);
          
          setState(prev => ({
            ...prev,
            step: "done",
            result,
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            step: "done",
            error: error instanceof Error ? error.message : "Unknown error",
          }));
        }
      };

      processComic();
    }
  }, [state.step, state.prompt, state.panelCount, state.artStyle, state.genre]);

  const handleInputChange = (value: string) => {
    setState(prev => ({ ...prev, currentInput: value }));
  };

  const handleDoneSubmit = (value: string) => {
    setState({
      step: "prompt",
      prompt: "",
      currentInput: value,
      panelCount: 4,
    });
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

  if (state.step === "options") {
    return (
      <OptionsInput
        currentInput={state.currentInput}
        onInputChange={handleInputChange}
        onSubmit={handleOptionsSubmit}
        prompt={state.prompt}
      />
    );
  }

  if (state.step === "processing") {
    return (
      <ProcessingView
        prompt={state.prompt}
        panelCount={state.panelCount}
      />
    );
  }

  if (state.step === "done") {
    return (
      <DoneView
        error={state.error}
        result={state.result}
        currentInput={state.currentInput}
        onInputChange={handleInputChange}
        onSubmit={handleDoneSubmit}
      />
    );
  }

  return null;
}

render(<App />);