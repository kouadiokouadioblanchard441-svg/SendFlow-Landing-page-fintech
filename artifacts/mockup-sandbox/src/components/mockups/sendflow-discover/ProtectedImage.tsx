import type { DragEvent, ImgHTMLAttributes, MouseEvent } from 'react';

type ProtectedImageProps = ImgHTMLAttributes<HTMLImageElement>;

/**
 * Discourages casual saving/dragging of visual assets without hiding them
 * from search engines or changing their accessible alt text.
 *
 * This is intentionally limited to non-interactive visual assets. The image
 * remains in the document as a normal <img> for SEO, accessibility, and
 * responsive image loading.
 */
export function ProtectedImage({
  className = '',
  onContextMenu,
  onDragStart,
  ...props
}: ProtectedImageProps) {
  const handleContextMenu = (event: MouseEvent<HTMLImageElement>) => {
    event.preventDefault();
    onContextMenu?.(event);
  };

  const handleDragStart = (event: DragEvent<HTMLImageElement>) => {
    event.preventDefault();
    onDragStart?.(event);
  };

  return (
    <img
      {...props}
      draggable={false}
      data-protected-visual="true"
      className={`protected-visual ${className}`.trim()}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    />
  );
}
