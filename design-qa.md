# Design QA

## Source reference

Reference: `https://otovideo.net/en/panel/projeler/yeni`  
Captured desktop and mobile states are stored in `outputs/otovideo/` in the working project workspace.

## Verified checks

- Captured source create form at desktop and mobile sizes; compared its dashboard, form sections, controls, and color treatment with the deployed Korean screen.
- GitHub Actions production build and Pages deployment completed successfully.
- Entered Toyota Camry test details and uploaded three local sample car photos to the deployed app.
- Generated and played a 9:16 H.264 MP4 preview: 720 × 1280, about 9.6 seconds, 2.2 MB.
- Downloaded the MP4 successfully to the local Downloads folder.
- Tested the vehicle-text parser with labeled make, model, year, mileage, price, fuel, and transmission values.

## Known limits

- The source account's video generation was not submitted because it showed one remaining video right and might consume that right. The clone's full render flow was tested separately.
- Listing URL import depends on the listing site's CORS policy. Pasting listing text or entering vehicle information manually is the fallback.
- HEIC images need conversion to JPG before upload. MP4 output contains no audio track.

## Result

final result: passed

The Korean create form, deployed build, photo upload, MP4 render, preview, and download were verified. The source account was not charged or changed.
