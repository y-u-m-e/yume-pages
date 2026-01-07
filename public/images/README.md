# Public Images Folder

Drop any images here and they'll be accessible via URL.

## Usage

1. Add your image to this folder (e.g., `my-image.png`)
2. Reference it in your code or anywhere using: `/images/my-image.png`

## Examples

| File Location | URL |
|--------------|-----|
| `public/images/logo.png` | `/images/logo.png` |
| `public/images/icons/coin.gif` | `/images/icons/coin.gif` |
| `public/images/banners/event-header.jpg` | `/images/banners/event-header.jpg` |

## In React Components

```jsx
<img src="/images/my-image.png" alt="My Image" />
```

## In CSS

```css
background-image: url('/images/my-background.png');
```

## Subfolders

You can create subfolders for organization:
- `/images/icons/` - Small icons and emojis
- `/images/banners/` - Header/banner images
- `/images/tiles/` - Tile event related images

## Supported Formats

- PNG, JPG, JPEG, GIF, WebP, SVG

