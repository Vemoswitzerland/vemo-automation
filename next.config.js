/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['imapflow', '@prisma/client', 'nodemailer']
  }
}
module.exports = nextConfig
