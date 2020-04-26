import React from 'react';
import './App.css';
import { conn, MESSAGE, INIT, PEER_CONNECTED, payloadType } from './constants.js';

class App extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            peerConnections: {},
            dataChannels: [],
            currentId: null,
            input: ""
        }
        this.sendMess = this.sendMess.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.makeOffer = this.makeOffer.bind(this);
        this.getPeerConnection = this.getPeerConnection.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    componentDidMount() {
        conn.onopen = () => {
            console.log("Connected to signalling server");
        }
        conn.onmessage = message => {
            console.log("[Connection OnMessage] : ", JSON.stringify(JSON.parse(message.data), null, 2));
            const data = JSON.parse(message.data);
            switch (data.eventType) {
                case INIT:
                    this.setState(pS => ({
                        ...pS,
                        currentId: data.id
                    }));
                    console.log("My Id is %s", this.state.currentId);
                    break;
                case PEER_CONNECTED:
                    this.makeOffer(data.id);
                    break;
                case MESSAGE:
                    this.handleMessage(data.payload);
                    break;
            }
        }
    }

    makeOffer = id => {
        let pc = this.getPeerConnection(id);
        pc.createOffer().then(offer => {
            console.log("Creating offer for ", id);
            pc.setLocalDescription(offer).then(() => {
                this.sendMess({
                    eventType: MESSAGE,
                    payload: {
                        by: this.state.currentId,
                        to: id,
                        type: payloadType.OFFER,
                        data: offer
                    }
                });
            });
        });
    }

    handleMessage = payload => {
        let pc = this.getPeerConnection(payload.by);
        let data = payload.data;
        let peer = this.state.peerConnections;
        switch (payload.type) {
            case "offer":
                pc.setRemoteDescription(new RTCSessionDescription(data));
                pc.createAnswer().then(answer => {
                    pc.setLocalDescription(answer);
                    console.log("Sending answer to %s", payload.by);
                    this.sendMess({
                        eventType: MESSAGE,
                        payload: {
                            by: this.state.currentId,
                            to: payload.by,
                            type: payloadType.ANSWER,
                            data: answer
                        }
                    });
                });
                break;
            case "answer":
                pc.setRemoteDescription(new RTCSessionDescription(data)).then(() => {
                    peer[payload.by] = pc;
                    this.setState({
                        ...this.state,
                        peerConnections: {
                            ...this.state.peerConnections,
                            peer
                        }
                    });
                });
                break;
            case "candidate":
                pc.addIceCandidate(new RTCIceCandidate(data)).then(() => {
                    peer[payload.by] = pc;
                    this.setState({
                        ...this.state,
                        peerConnections: {
                            ...this.state.peerConnections,
                            peer
                        }
                    });
                });
                break;
        }
    }

    sendMess = message => {
        conn.send(JSON.stringify(message))
    }

    getPeerConnection = id => {
        let peer = this.state.peerConnections;
        if (peer[id] == null) {
            let pc = new RTCPeerConnection(null, {
                optional: [{
                    RtpDataChannels: true
                }]
            });
            console.log(this.state);
            peer[id] = pc;
            this.setState({
                ...this.state,
                peerConnections: {
                    ...this.state.peerConnections,
                    peer
                },
            });
            pc.onicecandidate = event => {
                if (event.candidate) {
                    this.sendMess({
                        eventType: MESSAGE,
                        payload: {
                            by: this.state.currentId,
                            to: id,
                            type: payloadType.CANDIDATE,
                            data: event.candidate
                        }
                    });
                }
            };
            let dataChannel = pc.createDataChannel("dataChannel", {
                reliable: true
            });
            dataChannel.onmessage = event => {
                console.log("message from  %s : %s", id, event.data);
            }
            this.setState(prevState => ({
                ...prevState,
                dataChannels: [
                    ...prevState.dataChannels, dataChannel
                ],
            }));
            console.log(this.state);
            console.log("DC----" + dataChannel)
            return pc;
        } else return peer[id];
    }

    handleInputChange = e => {
        this.setState({ ...this.state, input: e.target.value });
    }

    sendMessage = () => {
        let value = this.state.input;
        console.log("My message %s", value);
        this.state.dataChannels.forEach(channel => {
            channel.send(value);
        });
    }

    render() {
        return (<div className="App">
            <div className="container">
                <h1>WebRTC Demo</h1>
                <input id="messageInput" type="text" className="form-control" placeholder="message" onChange={this.handleInputChange} />
                <button type="button" className="btn btn-primary" onClick={this.sendMessage}>SEND</button>
            </div>
        </div>
        );
    }
}


export default App;