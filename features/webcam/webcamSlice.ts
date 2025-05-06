import { createSlice } from '@reduxjs/toolkit'

const webcamSlice = createSlice({
  name: 'webcam',
  initialState: {
    isActive: false,
  },
  reducers: {
    startWebcam: (state) => {
      state.isActive = true
    },
    stopWebcam: (state) => {
      state.isActive = false
    },
  },
})

export const { startWebcam, stopWebcam } = webcamSlice.actions
export default webcamSlice.reducer
