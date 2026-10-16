import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { documentDownloadUrl, fetchDocuments, uploadDocument } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const uploadSchema = z.object({
  file: z
    .any()
    .refine((files) => files instanceof FileList && files.length === 1, 'Choose a file to upload')
    .refine((files) => files?.[0]?.size > 0, 'File is empty'),
})

export default function DocumentPanel({ instanceId, nodeKey, nodeLabel, readOnly = false }) {
  const qc = useQueryClient()
  const docs = useQuery({
    queryKey: queryKeys.instances.documents(instanceId),
    queryFn: () => fetchDocuments(instanceId),
    enabled: !!instanceId,
  })

  const form = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { file: undefined },
  })
  const nodeDocuments = (docs.data || []).filter(
    (document) => !nodeKey || document.nodeKey === nodeKey,
  )

  const upload = useMutation({
    mutationFn: (file) => uploadDocument(instanceId, file),
    onSuccess: () => {
      toast.success('Attachment uploaded')
      form.reset()
      qc.invalidateQueries({ queryKey: queryKeys.instances.documents(instanceId) })
      qc.invalidateQueries({ queryKey: queryKeys.instances.audit(instanceId) })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Upload failed'),
  })

  function onUpload(values) {
    const file = values.file?.[0]
    if (file) upload.mutate(file)
  }

  return (
    <section aria-labelledby="attachments-heading" className="space-y-3 border-t pt-4">
      <div>
        <h3 id="attachments-heading" className="text-sm font-semibold tracking-tight">
          Step attachments
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {nodeLabel ? `Files for ${nodeLabel}` : 'Files for this workflow step'}
        </p>
      </div>
      <div className="space-y-3">
        {!readOnly && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpload)} className="flex flex-wrap items-end gap-3" noValidate>
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value: _value, ...field } }) => (
                  <FormItem className="min-w-0 flex-1">
                    <FormLabel>Choose file</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        disabled={upload.isPending || form.formState.isSubmitting}
                        {...field}
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" variant="outline" disabled={upload.isPending || form.formState.isSubmitting}>
                <Upload className="h-3.5 w-3.5" />
                {upload.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </form>
          </Form>
        )}

        <div className="space-y-2">
          {docs.isLoading && (
            <p className="text-sm text-muted-foreground">Loading attachments…</p>
          )}
          {docs.isError && (
            <p className="text-sm text-destructive">Could not load attachments.</p>
          )}
          {!docs.isLoading && !docs.isError && nodeDocuments.length === 0 && (
            <p className="text-sm text-muted-foreground">No files attached to this step.</p>
          )}
          {!docs.isLoading && !docs.isError && nodeDocuments.map((d) => (
            <Button
              key={d.id}
              type="button"
              variant="outline"
              className="h-auto w-full justify-between px-3 py-2 font-normal"
              onClick={() => {
                const token = useAuthStore.getState().token
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
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
