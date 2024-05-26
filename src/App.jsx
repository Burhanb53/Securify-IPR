import { useState, useEffect, useContext } from "react";
import { contractAddress, contractABI } from "./constants";
import { ethers } from "ethers";
import { AiOutlineCopy } from "react-icons/ai";
import { IoOpenOutline } from "react-icons/io5";

import axios from "axios";
import FormData from "form-data";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [state, setState] = useState({
    provider: null,
    signer: null,
    contract: null,
  });
  // const { state: s, setProvider } = useContext(Context)
  // console.log({ state: s })
  const [connected, setConnected] = useState(false);
  const [cid, setCid] = useState("");
  const [signature, setSignature] = useState("");
  const [page, setPage] = useState("sign");
  const [account, setAccount] = useState("");
  const [showSignerInput, setShowSignerInput] = useState(false);
  const [signedTxData, setSignedTxData] = useState([]);
  const [receivedTxData, setReceivedTxData] = useState([]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        // switching to correct network
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // chainId must be in hexadecimal
        });
        setAccount(accounts[0]);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        setState({ provider, signer, contract });
        console.log("connected accounts", accounts);
        document.getElementById("connect_button").innerHTML = "connected";
        setConnected(true);
      } else {
        alert("Please install metamask");
      }
    } catch (error) {
      console.log(error);
    }
  };

  async function uploadImg() {
    console.log("upppload image calllled");

    const formData = new FormData();
    const file = document.getElementById("file").files[0];

    console.log("file is : ", file);
    if (!file) {
      console.log("file not uploaded");
      toast.error("please select the Patent Document First !", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      return;
    }
    formData.append("file", file);
    console.log(formData);

    console.log("new pinata ipfs added");
    toast("Uploading...please wait", {
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
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
          pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_API_KEY,
        },
      }
    );
    console.log("ipfs hash generated!");
    console.log(response.data.IpfsHash);
    setCid(response.data.IpfsHash);
    console.log("Content added with CID:", cid);
  }

  async function getSignature() {
    if (!cid) {
      console.log("cid is", cid);
      console.log("toastify error");
      toast.error("please upload the Patent to IPFS first!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      return;
    }
    const packedMessage = ethers.utils.solidityPack(["string"], [cid]);
    console.log("packed msg: ", packedMessage);
    const hash = ethers.utils.keccak256(packedMessage);

    const res = await window.ethereum.request({
      method: "personal_sign",
      params: [account, hash],
    });
    console.log("signature:", res);
    setSignature(res);
  }

  async function checkValidity() {
    let signingAuthority = document.querySelector("#signer").value;
    if (signingAuthority[0] === '"') {
      signingAuthority = signingAuthority.substring(
        1,
        signingAuthority.length - 1
      );
    }
    const msg = document.querySelector("#msg").value;
    const signature = document.querySelector("#signature").value;
    const valid = await state.contract.verify(signingAuthority, msg, signature);
    console.log("signature is", valid);
    document.querySelector("#valid").innerHTML = `<h1>${valid}</h1>`;
  }

  async function saveData() {
    const receiver = document.querySelector("#receiver").value;
    const message = document.querySelector("#message").value;

    console.log(receiver, message, cid);
    console.log(signature);
    console.log(account);

    console.log("sendig transactoin...");

    toast.info("Transaction submitted to the blockchain!", {
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
    );
    await saved.wait();
    toast.success(
      "data successfully stored in blockchain! Check the data section",
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      }
    );
    console.log("saveData ", saved);
  }

  async function setSenderData() {
    console.log("setsenderData is called...!!");
    console.log("account: ", account);
    if (state.contract) {
      console.log("contract is: ", state.contract);
      const senderTxIds = await state.contract.retrieveSenderSignaturesTxIds(
        account
      );
      console.log(senderTxIds);
      setSignedTxData([]);
      await senderTxIds.forEach(async (id) => {
        const transaction = await state.contract.getTransactionById(id);
        setSignedTxData((prev) => [...prev, transaction]);
      });
    }
  }

  async function setReceiverData() {
    if (state.contract) {
      const receiverTxIds =
        await state.contract.retrieveRecieverSignaturesTxIds(account);

      setReceivedTxData([]);
      console.log("receiverTxIds", receiverTxIds);
      await receiverTxIds.forEach(async (id) => {
        const transaction = await state.contract.getTransactionById(id);
        setReceivedTxData((prev) => [...prev, transaction]);
      });
    }
  }

  async function getSignerAddress() {
    const msg = document.querySelector("#msg").value;
    const signature = document.querySelector("#signature").value;
    const signerAddress = await state.contract.getSigner(msg, signature);
    console.log("signature is", signerAddress);
    document.querySelector("#valid").innerHTML = `<h1>${signerAddress}</h1>`;
  }

  return (
    <div className="bg-[#D8BFD8] min-h-screen max-h-full">
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-6 shadow-lg rounded-lg">
        <div className="ml-8 text-2xl text-white">
          <span className="font-bold">Securify IPR</span>
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

      {connected ? (<div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex justify-center mb-6">
                {["sign", "verify", "data"].map((item) => (
                    <div
                        key={item}
                        className={`text-3xl cursor-pointer mx-8 p-4 rounded-lg transition ${
                            page === item ? "bg-purple-600 text-white" : "bg-white text-purple-600"
                        }`}
                        onClick={() => setPage(item)}
                    >
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                    </div>
                ))}
            </div>

            {page === "sign" && (
                <div className="flex flex-col md:flex-row w-full">
                    <div className="md:w-1/2 p-6">
                        <div className="text-2xl font-bold mb-4">IPR Verification dApp</div>
                        <div className="text-xl mb-4">
                            This application solves the problem of Patent counterfeiting in today's world. The Organizations can sign the Patent provided to the candidate using their private key and anyone can verify the same using the signature provided to the receiver along with the CID and the public key of the signing organization.
                        </div>
                        <div className="text-xl underline font-semibold mb-2">Steps involved:</div>
                        <ol className="list-decimal ml-6 text-xl">
                            <li className="mb-2">Upload Patent to IPFS</li>
                            <li className="mb-2">Sign the generated CID using the organization's private key</li>
                            <li className="mb-2">Store the CID and signature in the blockchain along with the receiver's address and the message</li>
                        </ol>
                    </div>
                    <div className="flex flex-col md:w-1/2 bg-white p-6 rounded-lg shadow-lg">
                        {cid ? (
                            <div className="mb-4">
                                <span className="font-semibold">CID: </span>{cid}
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row justify-around items-center mb-4">
                                <input type="file" id="file" className="mb-4 md:mb-0 md:mr-4" />
                                <button
                                    onClick={uploadImg}
                                    className="bg-purple-600 text-white p-3 rounded-lg transition hover:bg-purple-700"
                                >
                                    Upload to IPFS
                                </button>
                            </div>
                        )}
                        {signature ? (
                            <div className="mb-4 flex items-center">
                                <div className="w-full overflow-hidden">{signature.slice(0, 20)}...</div>
                                <div
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(signature);
                                    }}
                                    className="cursor-pointer ml-2 text-xl text-purple-600"
                                >
                                    <AiOutlineCopy />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full mb-4">
                                <button
                                    onClick={getSignature}
                                    className="bg-purple-600 text-white w-full p-3 rounded-lg transition hover:bg-purple-700"
                                >
                                    Sign the CID
                                </button>
                            </div>
                        )}
                        <input
                            type="text"
                            className="border border-gray-300 p-3 mb-4 rounded-lg w-full"
                            placeholder="Receiver address (0xed7852...)"
                            id="receiver"
                        />
                        <input
                            type="text"
                            className="border border-gray-300 p-3 mb-4 rounded-lg w-full"
                            placeholder="Certificate data"
                            id="message"
                        />
                        {signature && (
                            <button
                                className="bg-purple-600 text-white w-full p-3 rounded-lg transition hover:bg-purple-700"
                                onClick={saveData}
                            >
                                Save to blockchain
                            </button>
                        )}
                    </div>
                </div>
            )}

            {page === "verify" && (
                <div className="flex flex-col items-center w-full">
                    <div className="max-w-screen-sm bg-white p-6 rounded-lg shadow-lg mb-6">
                        <div className="font-bold text-2xl mb-4">Verify IPR's authenticity</div>
                        <div className="text-xl mb-4">
                            <span className="underline font-semibold">Steps involved:</span>
                            <ol className="list-decimal ml-6">
                                <li className="mb-2">Get the CID and the signature of the signer from the data section</li>
                                <li className="mb-2">Paste the CID and signature in the provided input fields</li>
                                <li className="mb-2">If you have the address of the organization, paste it in the provided field</li>
                                <li className="mb-2">Click the button to get the signing authority or the boolean value</li>
                            </ol>
                        </div>
                    </div>
                    <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <div className="flex items-center mb-4 w-full">
                            <label className="text-2xl font-semibold mr-4">CID:</label>
                            <input
                                type="text"
                                id="msg"
                                className="border border-gray-300 p-3 rounded-lg flex-grow"
                                placeholder="Signed message"
                            />
                        </div>
                        <div className="flex items-center mb-4 w-full">
                            <label className="text-2xl font-semibold mr-4">Signature:</label>
                            <input
                                type="text"
                                id="signature"
                                className="border border-gray-300 p-3 rounded-lg flex-grow"
                                placeholder="Signature"
                            />
                        </div>
                        {showSignerInput && (
                            <div className="flex items-center mb-4 w-full">
                                <label className="text-2xl font-semibold mr-4">Signer address:</label>
                                <input
                                    type="text"
                                    id="signer"
                                    className="border border-gray-300 p-3 rounded-lg flex-grow"
                                    placeholder="Signing authority"
                                />
                            </div>
                        )}
                        <div className="flex flex-col items-center w-full">
                            {!showSignerInput ? (
                                <button
                                    onClick={getSignerAddress}
                                    className="bg-purple-600 text-white p-3 rounded-lg transition hover:bg-purple-700 w-full mb-2"
                                >
                                    Get the signer address
                                </button>
                            ) : (
                                <button
                                    onClick={checkValidity}
                                    className="bg-purple-600 text-white p-3 rounded-lg transition hover:bg-purple-700 w-full mb-2"
                                >
                                    Get the confirmation for address
                                </button>
                            )}
                            <div id="valid" className="text-2xl font-semibold mt-4"></div>
                            <div
                                className="text-sm text-blue-900 cursor-pointer mt-2"
                                onClick={() => setShowSignerInput(!showSignerInput)}
                            >
                                {showSignerInput ? "Didn't have the signer address?" : "Already have the signer address? Try this"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {page === "data" && (
                <div className="flex flex-col md:flex-row justify-around w-full">
                    <div className="bg-white w-full md:w-1/2 p-6 rounded-lg shadow-lg mb-6">
                        <div className="underline underline-offset-2 mb-4 text-xl font-semibold">Title of Patent</div>
                        {signedTxData.map((tx) => (
                            <div key={tx.timestamp} className="border border-gray-300 p-4 mb-4 rounded-lg">
                                <div className="font-semibold mb-2">Timestamp: {tx.timestamp.toString()}</div>
                                <div className="font-semibold mb-2">Receiver: {tx.sender}</div>
                                <div className="flex items-center mb-2">
                                    <div className="flex-grow">Signature: {tx.signature.slice(0, 40)}...</div>
                                    <div
                                        onClick={async () => await navigator.clipboard.writeText(tx.signature)}
                                        className="cursor-pointer ml-2 text-xl text-purple-600"
                                    >
                                        <AiOutlineCopy />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div>CID: {tx.cid}</div>
                                    <a
                                        href={`https://ipfs.io/ipfs/${tx.cid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xl text-purple-600"
                                    >
                                        <IoOpenOutline />
                                    </a>
                                </div>
                                <div className="font-semibold">Message: {tx.message}</div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white w-full md:w-1/2 p-6 rounded-lg shadow-lg mb-6">
                        <div className="underline underline-offset-2 mb-4 text-xl font-semibold">Signatures you received:</div>
                        {receivedTxData.map((tx) => (
                            <div key={tx.timestamp} className="border border-gray-300 p-4 mb-4 rounded-lg">
                                <div className="font-semibold mb-2">Timestamp: {tx.timestamp.toString()}</div>
                                <div className="font-semibold mb-2">Signer: {tx.sender}</div>
                                <div className="flex items-center mb-2">
                                    <div className="flex-grow">Signature: {tx.signature.slice(0, 40)}...</div>
                                    <div
                                        onClick={async () => await navigator.clipboard.writeText(tx.signature)}
                                        className="cursor-pointer ml-2 text-xl text-purple-600"
                                    >
                                        <AiOutlineCopy />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div>CID: {tx.cid}</div>
                                    <a
                                        href={`https://ipfs.io/ipfs/${tx.cid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xl text-purple-600"
                                    >
                                        <IoOpenOutline />
                                    </a>
                                </div>
                                <div className="font-semibold">Message: {tx.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      ) : (
        <div className="text-3xl font-semibold flex justify-center">
          <br></br> Link Wallet to get Connect with us !!
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default App;
