/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['imapflow', '@prisma/client', 'nodemailer', 'node-cron'],
    instrumentationHook: true,
  }
}
module.exports = nextConfig
