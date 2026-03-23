import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// ─── In-memory store (replace with DB) ───────────────────────────────────────

type Habit = {
  id: string
  day: string
  category: string
  label: string
  done: boolean
}

let habits: Habit[] = []

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all habits
app.get('/api/habits', (_req: Request, res: Response) => {
  res.json(habits)
})

// GET habits by day
app.get('/api/habits/:day', (req: Request, res: Response) => {
  const { day } = req.params
  res.json(habits.filter((h) => h.day.toLowerCase() === day.toLowerCase()))
})

// POST create habit
app.post('/api/habits', (req: Request, res: Response) => {
  const { day, category, label } = req.body
  if (!day || !category || !label) {
    return res.status(400).json({ error: 'day, category, and label are required' })
  }
  const habit: Habit = {
    id: Math.random().toString(36).slice(2, 9),
    day,
    category,
    label: label.toUpperCase(),
    done: false,
  }
  habits.push(habit)
  res.status(201).json(habit)
})

// PATCH toggle habit done
app.patch('/api/habits/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params
  const habit = habits.find((h) => h.id === id)
  if (!habit) return res.status(404).json({ error: 'Habit not found' })
  habit.done = !habit.done
  res.json(habit)
})

// DELETE habit
app.delete('/api/habits/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = habits.findIndex((h) => h.id === id)
  if (index === -1) return res.status(404).json({ error: 'Habit not found' })
  habits.splice(index, 1)
  res.json({ success: true })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Habit Tracker API running on http://localhost:${PORT}`)
})

export default app
