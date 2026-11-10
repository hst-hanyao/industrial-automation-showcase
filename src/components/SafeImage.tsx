import { useState, type ImgHTMLAttributes } from 'react'

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  readonly fallbackText?: string
}

export function SafeImage({
  fallbackText = '图片未能加载，请刷新或检查网络',
  onError,
  alt,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="safe-image-fallback" role="img" aria-label={alt || fallbackText}>
        {fallbackText}
      </span>
    )
  }

  return (
    <img
      {...props}
      alt={alt}
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}
