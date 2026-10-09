import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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

const decisionSchema = z.object({
  decisionValue: z.string().min(1, 'Select a decision'),
  signaturePlaceholder: z.string().optional(),
})

/** Prompt-required: Pass/Fail or Yes/No (and configured options); server picks next node. */
export default function DecisionNode({ actions, disabled, onDecide }) {
  const form = useForm({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      decisionValue: '',
      signaturePlaceholder: '',
    },
  })

  const selected = form.watch('decisionValue')

  function submit(values) {
    onDecide(values.decisionValue, values.signaturePlaceholder?.trim() || 'ack')
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <p className="text-sm text-muted-foreground">
          Choose an outcome. The server resolves the next node — the UI never picks it.
        </p>
        <FormField
          control={form.control}
          name="decisionValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision</FormLabel>
              <div className="flex flex-wrap gap-2">
                {(actions || []).map((a) => {
                  const negative = a.value === 'FAIL' || a.value === 'NO'
                  const active = field.value === a.value
                  return (
                    <Button
                      key={a.value}
                      type="button"
                      disabled={disabled}
                      variant={negative ? 'destructive' : 'success'}
                      className={active ? 'ring-2 ring-ring ring-offset-2' : undefined}
                      onClick={() => field.onChange(a.value)}
                    >
                      {a.label}
                    </Button>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="signaturePlaceholder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Digital signature placeholder</FormLabel>
              <FormControl>
                <Input disabled={disabled} placeholder="Typed acknowledgement" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={disabled || form.formState.isSubmitting || !selected}>
          Record decision
        </Button>
      </form>
    </Form>
  )
}
