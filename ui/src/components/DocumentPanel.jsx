import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Paperclip, Upload } from 'lucide-react'
import { documentDownloadUrl, fetchDocuments, uploadDocument } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DocumentPanel({ instanceId }) {
  const inputRef = useRef(null)
  const qc = useQueryClient()
  const docs = useQuery({
    queryKey: ['documents', instanceId],
    queryFn: () => fetchDocuments(instanceId),
    enabled: !!instanceId,
  })

  const upload = useMutation({
    mutationFn: (file) => uploadDocument(instanceId, file),
    onSuccess: () => {
      toast.success('Attachment uploaded')
      qc.invalidateQueries({ queryKey: ['documents', instanceId] })
      qc.invalidateQueries({ queryKey: ['audit', instanceId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Upload failed'),
  })

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
          <CardDescription>Secure upload; download requires sign-in.</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload.mutate(file)
            e.target.value = ''
          }}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {(docs.data || []).length === 0 && (
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
        )}
        {(docs.data || []).map((d) => (
          <a
            key={d.id}
            href={documentDownloadUrl(instanceId, d.id)}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            onClick={(e) => {
              e.preventDefault()
              const token = localStorage.getItem('amms_token')
              fetch(documentDownloadUrl(instanceId, d.id), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              })
                .then((r) => {
                  if (!r.ok) throw new Error('Download failed')
                  return r.blob()
                })
                .then((blob) => {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = d.fileName || 'attachment'
                  a.click()
                  URL.revokeObjectURL(url)
                })
                .catch(() => toast.error('Download failed'))
            }}
          >
            <span className="truncate">{d.fileName}</span>
            <Download className="h-4 w-4 shrink-0 text-primary" />
          </a>
        ))}
      </CardContent>
    </Card>
  )
}
