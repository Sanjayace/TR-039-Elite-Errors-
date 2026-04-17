# Multi-Agent Code Generation and Debugging System

## Overview

The growing complexity of software development has created a significant demand for tools that can translate high-level problem descriptions into executable code. Developers often spend a disproportionate amount of time on routine algorithmic implementations, syntax errors, and iterative debugging cycles. 

Traditional code generation tools operate as monolithic systems — they generate code in a single pass without any built-in mechanism for validation or self-correction. 

This project solves that by utilizing a collaborative **Multi-Agent** approach where specialized AI agents iteratively generate, mathematically validate, and dynamically debug code based on your prompts. 

## Features

- **Generator Agent**: Detects the desired programming language and generates the initial code using the Gemini LLM.
- **Validator Agent**: Automatically acts as a static analysis reviewer, analyzing the code for syntax issues and bad patterns.
- **Debugger Agent**: Corrects code based on the Validator's feedback, running iteratively to self-correct and guarantee an optimal output.
- **Real-Time Streaming Pipeline**: Fully reactive UI visualizing every agent interaction and generation phase.

## Tech Stack
- Frontend: HTML/CSS/VanillaJS
- Backend: Node.js, Express, Server-Sent Events (SSE)
- Core AI: `@google/genai` (Gemini 2.5 Flash)

## Setup

1. **Clone the repo**
2. **Install dependencies**: `npm install`
3. **Configure Environment Parameters**: Create a `.env` file and define `GEMINI_API_KEY=your_key`
4. **Run Dev Server**: `npm run dev`
5. Visit `http://localhost:3000` to interact with the Multi-Agent Code System.
