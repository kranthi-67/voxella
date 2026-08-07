# Voxella deployment

Voxella is a Node.js app with MongoDB and Cloudinary media uploads. Deploy the complete repository as a Node.js web service, using `npm start`.

Publishing only `public/` (such as on GitHub Pages) shows the interface but cannot upload a profile picture, log in, use chats, or call `/api` routes because no server is running.

Set every value in `.env.example` in the host's environment-variable settings. Keep `.env` private and never commit it. After redeploying, open the web-service URL rather than a static-site URL.
