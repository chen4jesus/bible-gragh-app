const withNextIntl = require('next-intl/plugin')('./app/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable reading files from the data directory
  webpack: (config) => {
    config.module.rules.push({
      test: /\.xml$/,
      use: 'raw-loader',
    })
    return config
  }
}

module.exports = withNextIntl(nextConfig) 