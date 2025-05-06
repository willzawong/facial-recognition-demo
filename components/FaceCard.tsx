'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  index: number
  age: number
  gender: string
  emotion: string
}

export function FaceCard({ index, age, gender, emotion }: Props) {
  return (
    <Card className="w-[250px] bg-black border border-neutral-500 text-neutral-400">
      <CardHeader>
        <CardTitle className="text-white">Face #{index + 1}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><strong className="text-white">Age:</strong> {age}</p>
        <p><strong className="text-white">Gender:</strong> {gender}</p>
        <p><strong className="text-white">Emotion:</strong> {emotion}</p>
      </CardContent>
    </Card>
  )
}
