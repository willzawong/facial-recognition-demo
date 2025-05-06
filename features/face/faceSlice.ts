// features/face/faceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type FaceInfo = {
  age: number
  gender: string
  expressions: Record<string, number>
}

const faceSlice = createSlice({
  name: 'face',
  initialState: {
    faces: [] as FaceInfo[],
  },
  reducers: {
    setFaces: (state, action: PayloadAction<FaceInfo[]>) => {
      state.faces = action.payload
    },
    clearFaces: (state) => {
      state.faces = []
    },
  },
})

export const { setFaces, clearFaces } = faceSlice.actions
export default faceSlice.reducer
