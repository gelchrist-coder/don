import axios from 'axios'

// API URL - empty string means same domain (works for both local dev with proxy and Vercel)
const API_URL = import.meta.env.VITE_API_URL || ''

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL
})

export default api
