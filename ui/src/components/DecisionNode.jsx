import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

export default function DecisionNode({ actions, disabled, onDecide }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose an outcome. The server resolves the next node — the UI never picks it.
      </p>
      <div className="flex flex-wrap gap-2">
        {(actions || []).map((a, idx) => {
          const negative = a.value === 'FAIL' || a.value === 'NO'
          return (
            <motion.div key={a.value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Button
                type="button"
                disabled={disabled}
                variant={negative ? 'destructive' : 'success'}
                onClick={() => onDecide(a.value)}
              >
                {a.label}
              </Button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
