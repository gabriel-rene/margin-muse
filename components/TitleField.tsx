'use client'

interface Props {
  title: string
  onChange: (title: string) => void
}

export default function TitleField({ title, onChange }: Props) {
  return (
    <input
      className="title-field"
      value={title}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Untitled"
      aria-label="Note title"
    />
  )
}
