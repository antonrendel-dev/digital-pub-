/**
 * Reusable JSON-LD structured data component.
 * Usage: <JsonLd data={schemaObject} />
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
