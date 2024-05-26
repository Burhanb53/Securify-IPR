import { useState, useEffect, useContext } from 'react';
import { contractAddress, contractABI } from './constants';
import { ethers } from 'ethers';
import { AiOutlineCopy } from 'react-icons/ai';
import { IoOpenOutline } from 'react-icons/io5';

import axios from 'axios';
import FormData from 'form-data';

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


function App() {  

    const [state, setState] = useState({
        provider: null,
        signer: null,
        contract: null,
    })
    // const { state: s, setProvider } = useContext(Context)
    // console.log({ state: s })
    const [connected, setConnected] = useState(false)
    const [cid, setCid] = useState('')
    const [signature, setSignature] = useState('')
    const [page, setPage] = useState('sign')
    const [account, setAccount] = useState('')
    const [showSignerInput, setShowSignerInput] = useState(false)
    const [signedTxData, setSignedTxData] = useState([])
    const [receivedTxData, setReceivedTxData] = useState([])

    const connectWallet = async () => {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                })
                // switching to correct network
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // chainId must be in hexadecimal
                })
                setAccount(accounts[0])

                const provider = new ethers.providers.Web3Provider(
                    window.ethereum
                )
                const signer = provider.getSigner()
                const contract = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    signer
                )
                setState({ provider, signer, contract })
                console.log('connected accounts', accounts)
                document.getElementById('connect_button').innerHTML =
                    'connected'
                setConnected(true)
            } else {
                alert('Please install metamask')
            }
        } catch (error) {
            console.log(error)
        }
    }

    async function uploadImg() {
        console.log('upppload image calllled')

        const formData = new FormData()
        const file = document.getElementById('file').files[0]

        console.log('file is : ', file)
        if (!file) {
            console.log('file not uploaded')
            toast.error('please select the Patent Document First !', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'light',
            })
            return
        }
        formData.append('file', file)
        console.log(formData)

        console.log('new pinata ipfs added')
        toast('Uploading...please wait', {
            position: "top-right",
            autoClose: 7000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            });

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
                    'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_API_KEY,
                },
            }
        )
        console.log('ipfs hash generated!')
        console.log(response.data.IpfsHash)
        setCid(response.data.IpfsHash)
        console.log('Content added with CID:', cid)
    }

    async function getSignature() {
        if (!cid) {
            console.log('cid is', cid)
            console.log('toastify error')
            toast.error('please upload the Patent to IPFS first!', {
                position: 'top-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'light',
            })
            return
        }
        const packedMessage = ethers.utils.solidityPack(['string'], [cid])
        console.log('packed msg: ', packedMessage)
        const hash = ethers.utils.keccak256(packedMessage)

        const res = await window.ethereum.request({
            method: 'personal_sign',
            params: [account, hash],
        })
        console.log('signature:', res)
        setSignature(res)
    }

    async function checkValidity() {
        let signingAuthority = document.querySelector('#signer').value
        if (signingAuthority[0] === '"') {
            signingAuthority = signingAuthority.substring(
                1,
                signingAuthority.length - 1
            )
        }
        const msg = document.querySelector('#msg').value
        const signature = document.querySelector('#signature').value
        const valid = await state.contract.verify(
            signingAuthority,
            msg,
            signature
        )
        console.log('signature is', valid)
        document.querySelector('#valid').innerHTML = `<h1>${valid}</h1>`
    }

    async function saveData() {
        const receiver = document.querySelector('#receiver').value
        const message = document.querySelector('#message').value

        console.log(receiver, message, cid)
        console.log(signature)
        console.log(account)

        console.log('sendig transactoin...')

        toast.info('Transaction submitted to the blockchain!', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            });

        const saved = await state.contract.storeSignature(
            account,
            receiver,
            cid.toString(),
            signature,
            message
        )
        await saved.wait()
        toast.success('data successfully stored in blockchain! Check the data section', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            });
        console.log('saveData ', saved)
    }

    async function setSenderData() {
        console.log('setsenderData is called...!!')
        console.log('account: ', account)
        if (state.contract) {
            console.log('contract is: ', state.contract)
            const senderTxIds =
                await state.contract.retrieveSenderSignaturesTxIds(account)
            console.log(senderTxIds)
            setSignedTxData([])
            await senderTxIds.forEach(async (id) => {
                const transaction = await state.contract.getTransactionById(id)
                setSignedTxData((prev) => [...prev, transaction])
            })
        }
    }

    async function setReceiverData() {
        if (state.contract) {
            const receiverTxIds =
                await state.contract.retrieveRecieverSignaturesTxIds(account)

            setReceivedTxData([])
            console.log('receiverTxIds', receiverTxIds)
            await receiverTxIds.forEach(async (id) => {
                const transaction = await state.contract.getTransactionById(id)
                setReceivedTxData((prev) => [...prev, transaction])
            })
        }
    }

    async function getSignerAddress() {
        const msg = document.querySelector('#msg').value
        const signature = document.querySelector('#signature').value
        const signerAddress = await state.contract.getSigner(msg, signature)
        console.log('signature is', signerAddress)
        document.querySelector('#valid').innerHTML = `<h1>${signerAddress}</h1>`
    }

   

    return (
        <div className='bg-[#F3E5F5] min-h-screen flex flex-col'>
            <div className="flex justify-between items-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-6 shadow-lg rounded-lg mb-4">
                <div className="ml-8 text-2xl text-white font-bold">
                    Securify IPR
                </div>
                <div className="mr-8">
                    <button
                        onClick={connectWallet}
                        id="connect_button"
                        className="bg-white text-purple-700 hover:bg-purple-700 hover:text-white font-semibold py-3 px-6 rounded-full transition duration-300 ease-in-out shadow-md"
                    >
                        Connect Bitget Wallet
                    </button>
                </div>
            </div>
    
            {connected ? (
                <div className="flex flex-col items-center">
                    <div className='flex flex-row justify-center mb-6'>
                        <div
                            className={`text-3xl cursor-pointer mx-4 p-2 rounded-md transition duration-300 ${
                                page === 'sign' ? 'bg-purple-500 text-white' : 'bg-white text-purple-500'
                            }`}
                            onClick={() => setPage('sign')}
                        >
                            Sign
                        </div>
                        <div
                            className={`text-3xl cursor-pointer mx-4 p-2 rounded-md transition duration-300 ${
                                page === 'verify' ? 'bg-purple-500 text-white' : 'bg-white text-purple-500'
                            }`}
                            onClick={() => setPage('verify')}
                        >
                            Verify
                        </div>
                        <div
                            className={`text-3xl cursor-pointer mx-4 p-2 rounded-md transition duration-300 ${
                                page === 'data' ? 'bg-purple-500 text-white' : 'bg-white text-purple-500'
                            }`}
                            onClick={() => {
                                setPage('data')
                                setSenderData()
                                setReceiverData()
                            }}
                        >
                            Data
                        </div>
                    </div>
                    {page === 'sign' && (
                        <div className='flex flex-col md:flex-row w-full px-8'>
                            <div className='md:w-1/2 p-4'>
                                <div className='text-2xl font-bold mb-2'>
                                    IPR Verification Dapp
                                </div>
                                <div className='text-lg mb-4'>
                                    This application addresses the issue of patent counterfeiting. Organizations can sign patents using their private key, and anyone can verify using the signature provided to the receiver along with the CID and the public key of the signing organization.
                                </div>
                                <div className='text-lg font-semibold underline mb-2'>
                                    Steps involved:
                                </div>
                                <ol className='list-decimal ml-4 text-lg'>
                                    <li>Upload patent to IPFS</li>
                                    <li>Sign the generated CID using the organization's private key</li>
                                    <li>Store the CID and signature in the blockchain along with the receiver's address and the message.</li>
                                </ol>
                            </div>
                            <div className='flex flex-col md:w-1/2 rounded-lg border-white border-4 p-4 items-center'>
                                {cid ? (
                                    <div className='m-4'>
                                        <span className='font-semibold'>CID: </span>
                                        {cid}
                                    </div>
                                ) : (
                                    <div className='flex flex-col md:flex-row justify-around items-center m-4'>
                                        <div>
                                            <input type='file' id='file' className='block' />
                                        </div>
                                        <button
                                            onClick={uploadImg}
                                            className='bg-purple-500 text-white rounded-md px-4 py-2 mt-4 md:mt-0 md:ml-4'
                                        >
                                            Upload to IPFS
                                        </button>
                                    </div>
                                )}
                                {signature ? (
                                    <div className='m-4 flex flex-row items-center'>
                                        <div className='w-full overflow-hidden '>
                                            {signature.slice(0, 20)}...
                                        </div>
                                        <div
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(signature)
                                            }}
                                            className='cursor-pointer ml-2'
                                        >
                                            <AiOutlineCopy />
                                        </div>
                                    </div>
                                ) : (
                                    <div className='w-full p-4'>
                                        <button
                                            onClick={getSignature}
                                            className='bg-purple-500 text-white w-full p-4 rounded-md'
                                        >
                                            Sign the CID
                                        </button>
                                    </div>
                                )}
                                <div className='w-full'>
                                    <input
                                        type='text'
                                        className='border-black border m-2 p-2 rounded-md w-full'
                                        placeholder='Receiver address (0xed7852...)'
                                        id='receiver'
                                    />
                                </div>
                                <div className='w-full'>
                                    <input
                                        type='text'
                                        className='border-black border m-2 p-2 rounded-md w-full'
                                        placeholder='Certificate data'
                                        id='message'
                                    />
                                </div>
                                <div className='w-full'>
                                    {signature && (
                                        <button
                                            className='bg-purple-500 text-white w-full p-4 rounded-md m-4'
                                            onClick={saveData}
                                        >
                                            Save to Blockchain
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
    
                    {page === 'verify' && (
                        <div className='flex flex-col w-full px-8 py-4'>
                        <div className='max-w-screen-sm mb-6'>
                            <div className='font-bold text-3xl text-purple-700 mb-4'>
                                Verify IPR's Authenticity
                            </div>
                            <div className='text-lg text-gray-700'>
                                <span className='underline font-semibold'>Steps involved:</span>
                                <ol className='list-decimal list-outside ml-6 mt-2'>
                                    <li className='mb-2'>Get the CID and the signature of the signer from the data section</li>
                                    <li className='mb-2'>Paste the CID and signature in the provided input fields</li>
                                    <li className='mb-2'>If you have the address of the organization, choose the option below and paste the organization's address as well</li>
                                    <li className='mb-2'>Hit the button to get the signing authority in case you didn't provide the address, or the boolean value in case you did</li>
                                </ol>
                            </div>
                        </div>
                        <div className='flex flex-col items-center'>
                            <div className='flex flex-col md:flex-row items-center mb-4 w-full'>
                                <label className='text-2xl font-semibold text-gray-800 md:mr-4 mb-2 md:mb-0' htmlFor='msg'>CID:</label>
                                <input
                                    type='text'
                                    id='msg'
                                    className='border border-gray-400 p-2 rounded-md w-full'
                                    placeholder='Signed message'
                                />
                            </div>
                            <div className='flex flex-col md:flex-row items-center mb-4 w-full'>
                                <label className='text-2xl font-semibold text-gray-800 md:mr-4 mb-2 md:mb-0' htmlFor='signature'>Signature:</label>
                                <input
                                    type='text'
                                    id='signature'
                                    className='border border-gray-400 p-2 rounded-md w-full'
                                    placeholder='Signature'
                                />
                            </div>
                            {showSignerInput && (
                                <div className='flex flex-col md:flex-row items-center mb-4 w-full'>
                                    <label className='text-2xl font-semibold text-gray-800 md:mr-4 mb-2 md:mb-0' htmlFor='signer'>Signer address:</label>
                                    <input
                                        type='text'
                                        id='signer'
                                        className='border border-gray-400 p-2 rounded-md w-full'
                                        placeholder='Signing authority'
                                    />
                                </div>
                            )}
                            <div className='flex flex-col justify-center items-center w-full'>
                                {!showSignerInput ? (
                                    <button
                                        onClick={getSignerAddress}
                                        className='bg-purple-500 text-white m-4 py-2 px-6 rounded-md font-semibold text-xl w-full transition duration-300 hover:bg-purple-600'
                                    >
                                        Get the signer address
                                    </button>
                                ) : (
                                    <button
                                        onClick={checkValidity}
                                        className='bg-purple-500 text-white m-4 py-2 px-6 rounded-md font-semibold text-xl w-full transition duration-300 hover:bg-purple-600'
                                    >
                                        Get the confirmation for address
                                    </button>
                                )}
                                <div id='valid' className='text-2xl font-semibold mt-4 text-gray-800'></div>
                            </div>
                            {!showSignerInput ? (
                                <div
                                    className='text-sm text-blue-700 cursor-pointer mt-4'
                                    onClick={() => setShowSignerInput(true)}
                                >
                                    Already have the signer address? Try this
                                </div>
                            ) : (
                                <div
                                    className='text-sm text-blue-700 cursor-pointer mt-4'
                                    onClick={() => setShowSignerInput(false)}
                                >
                                    Don't have the signer address?
                                </div>
                            )}
                        </div>
                    </div>
                    
                    )}
    
                    {page === 'data' && (
                        <div className='flex flex-col w-full px-8'>
                            <div className='border border-black w-full m-4 p-4 rounded-2xl font-semibold bg-white shadow-lg'>
                                <div className='underline underline-offset-2 mb-2 text-xl'>
                                    Title of Patent
                                </div>
                                {signedTxData.map((tx) => (
                                    <div className='border border-black mx-2 my-2 rounded-2xl p-2'>
                                        <div className='text-lg'>Timestamp: {tx.timestamp.toString()}</div>
                                        <div className='text-lg'>Receiver: {tx.sender}</div>
                                        <div className='flex items-center text-lg'>
                                            <div>Signature: {tx.signature.slice(0, 40)}...</div>
                                            <div
                                                onClick={async () => await navigator.clipboard.writeText(tx.signature)}
                                                className='cursor-pointer ml-2'
                                            >
                                                <AiOutlineCopy />
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-2 text-lg'>
                                            <div>CID: {tx.cid}</div>
                                            <a href={`https://ipfs.io/ipfs/${tx.cid}`} target='_blank' rel='noopener noreferrer'>
                                                <IoOpenOutline />
                                            </a>
                                        </div>
                                        <div className='text-lg'>Message: {tx.message}</div>
                                    </div>
                                ))}
                            </div>
                            <div className='border border-black w-full m-4 p-4 rounded-2xl font-semibold bg-white shadow-lg'>
                                <div className='underline underline-offset-2 mb-2 text-xl'>
                                    Signatures You Received:
                                </div>
                                {receivedTxData.map((tx) => (
                                    <div className='border border-black mx-2 my-2 rounded-2xl p-2'>
                                        <div className='text-lg'>Timestamp: {tx.timestamp.toString()}</div>
                                        <div className='text-lg'>Signer: {tx.sender}</div>
                                        <div className='flex items-center text-lg'>
                                            <div>Signature: {tx.signature.slice(0, 40)}...</div>
                                            <div
                                                onClick={async () => await navigator.clipboard.writeText(tx.signature)}
                                                className='cursor-pointer ml-2'
                                            >
                                                <AiOutlineCopy />
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-2 text-lg'>
                                            <div>CID: {tx.cid}</div>
                                            <a href={`https://ipfs.io/ipfs/${tx.cid}`} target='_blank' rel='noopener noreferrer'>
                                                <IoOpenOutline />
                                            </a>
                                        </div>
                                        <div className='text-lg'>Message: {tx.message}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-3xl font-semibold flex justify-center mt-8'>
                    Link Wallet to get Connected with us!!
                </div>
            )}
            <ToastContainer />
        </div>
    )
    
}

export default App;
