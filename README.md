This is a dungeon generator.

To run the generator, run `npm run dev`.

## API Integration

The dungeon generator now integrates with an external API for saving and loading expeditions. The API endpoints are:

- Get current expedition number: `GET /api/expeditions/current-expedition-number`
- Set current expedition number: `POST /api/expeditions/current-expedition-number`
- Get all expedition numbers: `GET /api/expeditions/generated-rooms/expeditions`
- Get rooms for a specific expedition: `GET /api/expeditions/generated-rooms/expedition/{expeditionNumber}`
- Get cached rooms for a specific expedition: `GET /api/expeditions/generated-rooms/cached/{expeditionNumber}`
- Create new generated rooms: `POST /api/expeditions/generated-rooms`
- Delete expedition by number: `DELETE /api/expeditions/generated-rooms/expedition/{expeditionNumber}`

### Configuration

The API URL is configured in the `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3100
```

You can change this to point to a different API server if needed.

To get started, copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Then modify the values as needed.

### Features

- View and set the current expedition number
- Save the current dungeon to the API
- Load dungeons from the API
- Delete expeditions from the API
- View a list of all available expeditions
