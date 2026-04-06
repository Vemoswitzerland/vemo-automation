import ContentPipeline from '@/components/content/ContentPipeline'

export default function ContentPipelinePage() {
  const isMock = !process.env.ANTHROPIC_API_KEY

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-vemo-dark-900">Content Pipeline</h1>
          <p className="text-vemo-dark-500 mt-1">
            Thema eingeben → Skript + Bild-Prompt + Video-Konzept generieren → Posten oder speichern
          </p>
        </div>
      </div>

      <ContentPipeline isMock={isMock} />
    </div>
  )
}
