/**
 * OmniResize Studio - Presets Database
 * Social media platforms, passport specifications, and print standards
 */

const PRESETS = [
  // Instagram
  {
    id: 'ig-square',
    category: 'instagram',
    platform: 'Instagram',
    name: 'Square Post',
    width: 1080,
    height: 1080,
    ratio: '1:1',
    description: 'Standard feed post'
  },
  {
    id: 'ig-portrait',
    category: 'instagram',
    platform: 'Instagram',
    name: 'Portrait Post',
    width: 1080,
    height: 1350,
    ratio: '4:5',
    description: 'Full vertical feed post'
  },
  {
    id: 'ig-landscape',
    category: 'instagram',
    platform: 'Instagram',
    name: 'Landscape Post',
    width: 1080,
    height: 566,
    ratio: '1.91:1',
    description: 'Horizontal feed'
  },
  {
    id: 'ig-story',
    category: 'instagram',
    platform: 'Instagram',
    name: 'Story & Reel',
    width: 1080,
    height: 1920,
    ratio: '9:16',
    description: 'Full screen story & reel'
  },
  {
    id: 'ig-avatar',
    category: 'instagram',
    platform: 'Instagram',
    name: 'Profile Picture',
    width: 320,
    height: 320,
    ratio: '1:1',
    description: 'Account profile picture'
  },

  // YouTube
  {
    id: 'yt-thumb',
    category: 'youtube',
    platform: 'YouTube',
    name: 'Video Thumbnail',
    width: 1280,
    height: 720,
    ratio: '16:9',
    description: 'HD video thumbnail'
  },
  {
    id: 'yt-banner',
    category: 'youtube',
    platform: 'YouTube',
    name: 'Channel Banner',
    width: 2560,
    height: 1440,
    ratio: '16:9',
    description: 'Desktop/TV channel header'
  },
  {
    id: 'yt-avatar',
    category: 'youtube',
    platform: 'YouTube',
    name: 'Channel Icon',
    width: 800,
    height: 800,
    ratio: '1:1',
    description: 'Channel profile picture'
  },

  // Twitter / X
  {
    id: 'tw-post',
    category: 'twitter',
    platform: 'X / Twitter',
    name: 'Feed Post',
    width: 1200,
    height: 675,
    ratio: '16:9',
    description: 'Single image tweet'
  },
  {
    id: 'tw-header',
    category: 'twitter',
    platform: 'X / Twitter',
    name: 'Profile Header',
    width: 1500,
    height: 500,
    ratio: '3:1',
    description: 'Top banner'
  },
  {
    id: 'tw-avatar',
    category: 'twitter',
    platform: 'X / Twitter',
    name: 'Profile Photo',
    width: 400,
    height: 400,
    ratio: '1:1',
    description: 'Avatar'
  },

  // Facebook & LinkedIn
  {
    id: 'fb-post',
    category: 'facebook',
    platform: 'Facebook',
    name: 'Shared Image',
    width: 1200,
    height: 630,
    ratio: '1.91:1',
    description: 'Feed link / post'
  },
  {
    id: 'fb-cover',
    category: 'facebook',
    platform: 'Facebook',
    name: 'Cover Photo',
    width: 820,
    height: 312,
    ratio: '2.6:1',
    description: 'Desktop cover'
  },
  {
    id: 'li-banner',
    category: 'linkedin',
    platform: 'LinkedIn',
    name: 'Profile Banner',
    width: 1584,
    height: 396,
    ratio: '4:1',
    description: 'Background header'
  },
  {
    id: 'li-post',
    category: 'linkedin',
    platform: 'LinkedIn',
    name: 'Feed Update',
    width: 1200,
    height: 627,
    ratio: '1.91:1',
    description: 'Professional post'
  },

  // Passports & Government ID photos
  {
    id: 'pass-us',
    category: 'passport',
    platform: 'Passport / Visa',
    name: 'US Passport / Visa (2x2 in)',
    width: 600,
    height: 600,
    ratio: '1:1',
    description: '2x2 inches @ 300 DPI'
  },
  {
    id: 'pass-schengen',
    category: 'passport',
    platform: 'Passport / Visa',
    name: 'Schengen / EU (35x45 mm)',
    width: 413,
    height: 531,
    ratio: '35:45',
    description: '35x45 mm @ 300 DPI'
  },
  {
    id: 'pass-india',
    category: 'passport',
    platform: 'Passport / Visa',
    name: 'India Passport (35x35 mm)',
    width: 413,
    height: 413,
    ratio: '1:1',
    description: '35x35 mm @ 300 DPI'
  },
  {
    id: 'pass-uk',
    category: 'passport',
    platform: 'Passport / Visa',
    name: 'UK Passport (35x45 mm)',
    width: 413,
    height: 531,
    ratio: '35:45',
    description: '35x45 mm standard'
  },

  // Print Standards
  {
    id: 'print-a4',
    category: 'print',
    platform: 'Standard Print',
    name: 'A4 Document (300 DPI)',
    width: 2480,
    height: 3508,
    ratio: '1:1.41',
    description: '210 x 297 mm'
  },
  {
    id: 'print-4x6',
    category: 'print',
    platform: 'Photo Print',
    name: '4 x 6 inch Photo',
    width: 1800,
    height: 1200,
    ratio: '3:2',
    description: 'Standard 4x6 photo'
  },
  {
    id: 'print-card',
    category: 'print',
    platform: 'Business Card',
    name: 'Business Card (3.5x2 in)',
    width: 1050,
    height: 600,
    ratio: '3.5:2',
    description: '300 DPI standard card'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRESETS };
}
