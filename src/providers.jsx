import { createContext, useContext, useState } from 'react'

export const Context = createContext(null)

export const useData = () => useContext(Context)

export const DataProvider = ({ children }) => {
    const [state, setState] = useState({
        provider: null,
        signer: null,
        contract: null,
    })

    // const connectWallet = async () => {
    //     try {
    //         if (window.ethereum !== 'undefined') {
    //             const accounts = await window.ethereum.request({
    //                 method: 'eth_requestAccounts',
    //             })
    //             setAccount(accounts[0])

    //             const provider = new ethers.providers.Web3Provider(
    //                 window.ethereum
    //             )
    //             const signer = provider.getSigner()
    //             const contract = new ethers.Contract(
    //                 contractAddress,
    //                 contractABI,
    //                 signer
    //             )
    //             setState({ provider, signer, contract })
    //             console.log('connected accounts', accounts)
    //             document.getElementById('connect_button').innerHTML =
    //                 'connected'
    //             setConnected(true)
    //         } else {
    //             alert('Please install metamask')
    //         }
    //     } catch (error) {
    //         console.log(error.code)
    //     }
    // }

    const setProvider = (input) => {
        setState({
            ...state,
            provider: input,
        })
    }
    return (
        <Context.Provider value={{ state, setProvider }}>
            {children}
        </Context.Provider>
    )
}
