import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const decisionSchema = z.object({
  decisionValue: z.string().min(1, 'Select a decision'),
  signaturePlaceholder: z.string().optional(),
})

export default function DecisionNode({ actions, disabled, onDecide }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      decisionValue: '',
      signaturePlaceholder: '',
    },
  })

  const selected = watch('decisionValue')

  function submit(values) {
    onDecide(values.decisionValue, values.signaturePlaceholder?.trim() || 'ack')
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-sm text-muted-foreground">
        Choose an outcome. The server resolves the next node — the UI never picks it.
      </p>
      <input type="hidden" {...register('decisionValue')} />
      <div className="flex flex-wrap gap-2">
        {(actions || []).map((a, idx) => {
          const negative = a.value === 'FAIL' || a.value === 'NO'
          const active = selected === a.value
          return (
            <motion.div
              key={a.value}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Button
                type="button"
                disabled={disabled}
                variant={negative ? 'destructive' : 'success'}
                className={active ? 'ring-2 ring-ring ring-offset-2' : undefined}
                onClick={() => setValue('decisionValue', a.value, { shouldValidate: true })}
              >
                {a.label}
              </Button>
            </motion.div>
          )
        })}
      </div>
      {errors.decisionValue && (
        <p className="text-xs text-destructive">{errors.decisionValue.message}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="decision-signature">Digital signature placeholder</Label>
        <Input
          id="decision-signature"
          disabled={disabled}
          placeholder="Typed acknowledgement"
          {...register('signaturePlaceholder')}
        />
      </div>
      <Button type="submit" disabled={disabled || isSubmitting || !selected}>
        Record decision
      </Button>
    </form>
  )
}
