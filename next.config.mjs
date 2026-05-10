/** @type {import('next').NextConfig} */
import path from 'path'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.watchOptions = {
      ignored: [
        '**/node_modules/**',
        '**/.next/**',
        '**/data/**',
        path.resolve('C:/DumpStack.log.tmp'),
        path.resolve('C:/hiberfil.sys'),
        path.resolve('C:/pagefile.sys'),
        path.resolve('C:/swapfile.sys'),
      ],
    }
    return config
  },
}

export default nextConfig
