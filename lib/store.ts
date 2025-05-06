import { configureStore } from '@reduxjs/toolkit'
import webcamReducer from '@/features/webcam/webcamSlice'
import faceReducer from '@/features/face/faceSlice'

export const store = configureStore({
  reducer: {
    webcam: webcamReducer,
    face: faceReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
