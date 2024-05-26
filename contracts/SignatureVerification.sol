// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SignatureVerification {

    struct Signature {
        address sender;
        address receiver;
        string cid;
        bytes signature;
        string message;
        uint timestamp;
    }

    Signature[] public signatures;
    // receiver => array of txId
    mapping (address => uint[]) public receiver;
    mapping (address => uint[]) public sender;

    function storeSignature(
        address _sender, 
        address _receiver,
        string memory _cid, 
        bytes memory _sig,
        string memory _message
    ) public returns(uint txId){
        signatures.push(
            Signature(msg.sender, _receiver, _cid, _sig, _message, block.timestamp)
        );
        
        uint index = signatures.length - 1;
        sender[_sender].push(index);
        receiver[_receiver].push(index);
        return index;
    }   

    function retrieveSenderSignaturesTxIds(address _senderAddress) external view returns(uint[] memory){
        return sender[_senderAddress];
    }
    function retrieveRecieverSignaturesTxIds(address _receiverAddress) external view returns(uint[] memory){
        return receiver[_receiverAddress];
    }
    function getTransactionById(uint _id) external view returns(Signature memory) {
        return signatures[_id];
    }

    /////////////////////////////////////
    //// VERIFICATION PART HERE /////////
    /////////////////////////////////////


    function verify(address _signer, string memory _message, bytes memory _sig) 
        external pure returns (bool)
    {
        bytes32 messageHash = keccak256(abi.encodePacked(_message));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", 
            messageHash
        ));
        return recover(ethSignedMessageHash, _sig) == _signer;
    }

    function getSigner(string memory _message, bytes memory _sig) external pure returns(address) {
        bytes32 messageHash = keccak256(abi.encodePacked(_message));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", 
            messageHash
        ));
        return recover(ethSignedMessageHash, _sig);
    }

    function recover(bytes32 _ethSignedMessageHash, bytes memory _sig)
        public pure returns(address)
    {
        (bytes32 r, bytes32 s, uint8 v) = split(_sig);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function split(bytes memory _sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_sig.length == 65, "invalid string entered");
        assembly{
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }
    } 
}