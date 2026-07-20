import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un package-lock.json traîne dans le dossier home de l'utilisateur : on ancre
  // explicitement la racine du workspace au projet pour éviter la mauvaise détection.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
