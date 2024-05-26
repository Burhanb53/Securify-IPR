import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { DataProvider } from './providers.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
            <App />
        {/* <DataProvider>
        </DataProvider> */}
    </React.StrictMode>
)
