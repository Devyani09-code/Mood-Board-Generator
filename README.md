
# Morrow

Morrow is a mood board and brand board generator that uses AI and is based on Replit.

It enables you to convert an idea, concept, or brand direction into a visual board without the need to begin from a blank canvas; in order to do this, the programme asks the user a few questions regarding what they would like to create and then produces a board featuring appropriate imagery, colours, and a visual direction.

Live website:(https://207f55fc-08b1-48f7-9199-5978d2a6a063-00-1579kpqey7sqd.pike.replit.dev/studio)

## What it does

Morrow begins with a brief that is in the form of a set of flashcards. If the user decides to create a mood board or a brand board, they are asked questions concerning their idea, layout, style, brand, or general vibe.

The backend then deals with the input by using AI to convert the brief into search terms for each image on the board; relevant stock images are obtained using these search terms, with Pexels being the main source and Unsplash serving as the backup.

What results is a board that can be edited rather than one that is a fixed output from an AI.

With regard to mood boards, users are free to move and adjust the size of the images or to substitute them with their own. Brand boards, on the other hand, have a more structured arrangement, allowing the images to be replaced without losing the general template.

With each board a colour scheme is created which is specifically tailored to the user's brief.

## Built with

* React
* TypeScript
* Vite
* Tailwind CSS
* Express
* OpenAPI
* Zod
* React Query
* Pexels API
* Unsplash API
* Clerk
* Replit

## Project structure
text
artifacts/
  moodboard-studio/       # Frontend
  api-server/             # Backend

lib/
  api-spec/               # OpenAPI specification
  api-zod/                # Backend validation
  api-client-react/       # Frontend API client and hooks
  db/                     # Database schema

The main studio experience, including the brief flow, board rendering, and editing functionality, is handled in:
text
artifacts/moodboard-studio/src/pages/studio.tsx

The board generation and image fetching logic lives in:
text
artifacts/api-server/src/routes/moodboards.ts

## Environment variables
env
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=

Pexels is the main source of images, with Unsplash serving as the backup; authentication is carried out using Clerk.

