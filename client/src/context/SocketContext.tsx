import {
    useState,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useCallback,
} from "react"
import toast from "react-hot-toast"
import { io, Socket } from "socket.io-client"
import { ReactNode } from "react"
import { useAppSelector } from "@/hooks"
import {
    MessageType,
    MyContactsType,
    MyGroupsType,
    ContactType,
    NewMessage,
    MessageResponse,
    FullMessageType,
} from "@/types"
import { useNavigate, useParams } from "react-router-dom"

interface SocketContextType {
    contacts: MyContactsType[]
    getMessages: (receiverId: string) => FullMessageType[]
    getContact: (contactId: string) => ContactType | undefined
    getGroup: (groupId: string) => MyGroupsType | undefined
    sendMessage: (receiverId: string, message: string) => void
    createNewChat: (userId: string) => Promise<void>
    createGroup: (name: string, members: string[]) => Promise<string>
    allContactsAndGroups: ContactType[]
}

const SocketContext = createContext<SocketContextType>({
    contacts: [],
    getMessages: () => [],
    getContact: () => undefined,
    sendMessage: () => undefined,
    createNewChat: () => Promise.reject(),
    createGroup: () => Promise.reject(),
    getGroup: () => undefined,
    allContactsAndGroups: [],
})

const SocketContextProvider = ({ children }: { children: ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [myContacts, setMyContacts] = useState<MyContactsType[]>([])
    const [myGroups, setMyGroups] = useState<MyGroupsType[]>([])
    const [messages, setMessages] = useState<Map<string, MessageType[]>>(
        new Map(),
    )
    const { loading, isAuthenticated, user } = useAppSelector(
        (state) => state.user,
    )

    const navigate = useNavigate()
    const { chatId } = useParams()

    // console.log(myContacts)
    // console.log(myGroups)
    console.log(messages)

    //log messages key and value
    // for (let [key, value] of messages.entries()) {
    //     console.log(value)
    // }

    const getMemberFromGroup = useCallback(
        (group: MyGroupsType, memberId: string) => {
            const member = group.members.find(
                (member) => member.user._id === memberId,
            )
            return member?.user
        },
        [],
    )
    const allContactsAndGroups: ContactType[] = useMemo(() => {
        const contacts: ContactType[] = myContacts.map((contact) => ({
            _id: contact._id,
            name: contact.name,
            image: contact.image,
            isGroup: false,
            lastMessage: messages.get(contact._id)?.[0],
            createdAt: contact.createdAt,
        }))
        const groups: ContactType[] = myGroups.map((group) => ({
            _id: group._id,
            name: group.name,
            image: group.image,
            isGroup: true,
            lastMessage: messages.get(group._id)?.[0],
            createdAt: group.createdAt,
        }))
        return [...contacts, ...groups]
    }, [myContacts, myGroups])
    const getContact = useCallback(
        (contactId: string) => {
            return allContactsAndGroups.find(
                (contact) => contact._id === contactId,
            )
        },
        [allContactsAndGroups],
    )
    const getMessages = (receiverId: string) => {
        const group = myGroups.find((group) => group._id === receiverId)
        return (
            messages.get(receiverId)?.map((message) => {
                return {
                    ...message,
                    sender: group
                        ? getMemberFromGroup(group, message.senderId)
                        : getContact(message.senderId),
                } as FullMessageType
            }) ?? []
        )
    }

    const saveMessage = useCallback((message: MessageType) => {
        setMessages((messageMap) => {
            console.log(messageMap)

            if (message.isGroup) {
                messageMap.get(message.receiverId)?.push(message) ??
                    messageMap.set(message.receiverId, [message])
            } else {
                const contactId =
                    message.senderId === user._id
                        ? message.receiverId
                        : message.senderId
                messageMap.get(contactId)?.push(message) ??
                    messageMap.set(contactId, [message])
            }

            return new Map(messageMap)
        })
    }, [])
    const sendMessage = useCallback(
        (receiverId: string, message: string) => {
            socket?.emit(
                "message:send",
                {
                    message,
                    receiverId,
                },
                (data: {
                    success: boolean
                    msg: string
                    message: NewMessage
                }) => {
                    console.log(data)
                    if (!data.success) toast.error(data.msg)
                    else {
                        if (import.meta.env.DEV) toast.success("Message sent")
                        saveMessage(data.message)
                    }
                },
            ) ?? toast.error("You are not connected to the server")
        },
        [socket, saveMessage],
    )
    const getGroup = useCallback(
        (groupId: string) => {
            return myGroups.find((group) => group._id === groupId)
        },
        [myGroups],
    )
    const createNewChat = (contactId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!socket) return reject("Socket not connected")
            //search myContacts for user
            const contact = myContacts.find(
                (contact) => contact._id === contactId,
            )
            if (contact) return resolve()

            socket.emit(
                "create:contact",
                { contactId },
                (data: {
                    success: boolean
                    msg: string
                    contact: MyContactsType
                }) => {
                    if (!data.success) {
                        console.log(data.msg)
                        reject(data.msg)
                    } else {
                        setMyContacts((prev) => [...prev, data.contact])
                        resolve()
                    }
                },
            )
        })
    }
    const createGroup = useCallback(
        (name: string, members: string[]): Promise<string> => {
            return new Promise((resolve, reject) => {
                if (!socket) return reject("Socket not connected")
                socket.emit(
                    "create:group",
                    { name, members },
                    (data: {
                        success: boolean
                        msg: string
                        group: MyGroupsType
                    }) => {
                        if (!data.success) {
                            console.log(data.msg)
                            reject(data.msg)
                        } else {
                            setMyGroups((prev) => [...prev, data.group])
                            resolve(data.group._id)
                        }
                    },
                )
            })
        },
        [socket],
    )

    // Toast message
    const toastMessage = (
        message: MessageType,
        groupOrSender: MyContactsType,
        senderInGroup?: MyContactsType,
    ) => {
        toast.custom(
            (t) => (
                <div
                    className={`${
                        t.visible ? "animate-enter" : "animate-leave"
                    } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                >
                    <button
                        className="flex-1 w-0 p-4"
                        onClick={() => {
                            toast.dismiss(t.id)
                            navigate(`/chat/${groupOrSender._id}`)
                        }}
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <img
                                    className="h-10 w-10 rounded-full"
                                    src={groupOrSender.image}
                                    alt={groupOrSender.name}
                                />
                            </div>
                            <div className="ml-3 flex-1 mr-auto text-left">
                                <p className="text-sm font-medium text-gray-900">
                                    {groupOrSender.name}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    {senderInGroup
                                        ? senderInGroup.name + ": "
                                        : ""}
                                    {message.message}
                                </p>
                            </div>
                        </div>
                    </button>
                    <div className="flex border-l border-gray-200">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ),
            {
                id: groupOrSender._id,
            },
        )
    }

    //Socket events
    const onNewMessage = useCallback(
        async (message: NewMessage) => {
            console.log("New message", message)
            saveMessage(message)

            //id sender is me, contact who send is open, or group for whom is send is open, then do not show toast
            if (
                message.senderId === user._id ||
                message.senderId === chatId ||
                message.receiverId === chatId
            )
                return
            if (message.isGroup) {
                toastMessage(message, message.receiver, message.sender)
            } else {
                toastMessage(message, message.sender)
            }
        },
        [chatId, saveMessage, toastMessage, user._id],
    )
    const onNewGroup = useCallback((group: MyGroupsType) => {
        const admin = group.members.find((member) => member.role === "admin")
        setMyGroups((prev) => [...prev, group])
        if (!admin || admin.user._id === user._id) return
        toast.success(`${admin?.user.name} added you ${group.name}`)
        // socketConnection.emit("join:new:group", { groupId: group._id })
    }, [])
    const onNewContact = useCallback((contact: MyContactsType) => {
        toast.success(`${contact.name} added you`)
        setMyContacts((prev) => [...prev, contact])
    }, [])

    useEffect(() => {
        if (loading || !isAuthenticated || !user.socketToken)
            return () => {
                socket?.disconnect()
                setMyContacts([])
                setMyGroups([])
                setMessages(() => new Map())
            }
        const socketConnection = io({
            autoConnect: false,
            auth: {
                token: user.socketToken,
            },
        })
        setSocket(() => socketConnection)

        const onConnect = () => {
            // if (import.meta.env.DEV)
            console.log("Socket connected" + socketConnection.id)
        }
        const onReconnect = () => {
            // if (import.meta.env.DEV)
            toast.success(`Connected`, {
                id: "socket-connection",
            })
            console.log("Reconnected")
        }
        const onConnect_error = (err: Error) => {
            // if (import.meta.env.DEV) socketConnection.disconnect()
            // toast.error(`Disconnected`, {
            //     id: "socket-connection",
            // })
            console.log(`connect_error due to ${err.message}`)
        }
        const onDisconnect = (reason: Socket.DisconnectReason) => {
            console.log(`socket disconnected due to ${reason}`)
        }
        const onConnectionSuccess = (data: {
            success: boolean
            msg: string
            contacts: MyContactsType[]
            groups: MyGroupsType[]
            messages: MessageResponse[]
        }) => {
            console.log("Connection success")
            console.log(data)
            setMyGroups(data.groups)
            setMyContacts(data.contacts)

            const messageMap = new Map<string, MessageType[]>()
            data.messages.forEach((message) => {
                if (message.isGroup) {
                    messageMap.get(message.receiverId)?.push(message) ??
                        messageMap.set(message.receiverId, [message])
                } else {
                    const contactId =
                        message.senderId === user._id
                            ? message.receiverId
                            : message.senderId
                    messageMap.get(contactId)?.push(message) ??
                        messageMap.set(contactId, [message])
                }
            })

            setMessages(messageMap)
            setSocket(() => socketConnection)
        }

        socketConnection.on("connect", onConnect)
        socketConnection.on("connect_error", onConnect_error)
        socketConnection.on("disconnect", onDisconnect)
        socketConnection.io.on("reconnect", onReconnect)

        socketConnection.on("connection:success", onConnectionSuccess)

        socketConnection.connect()

        return () => {
            socketConnection.disconnect()
            setMyContacts([])
            setMyGroups([])
            setMessages(() => new Map())
        }
    }, [loading, isAuthenticated, user.socketToken])

    useEffect(() => {
        if (!socket) return
        if (!socket.connected) {
            return
        }
        socket.on("message:new", onNewMessage)
        socket.on("new:group", onNewGroup)
        socket.on("new:contact", onNewContact)
        return () => {
            socket.off("message:new", onNewMessage)
            socket.off("new:group", onNewGroup)
            socket.off("new:contact", onNewContact)
        }
    }, [socket, chatId, onNewMessage, onNewGroup, onNewContact])

    return (
        <SocketContext.Provider
            value={{
                contacts: myContacts,
                getGroup,
                getMessages,
                getContact,
                sendMessage,
                createNewChat,
                createGroup,
                allContactsAndGroups,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}
const useSocketContext = () => {
    return useContext(SocketContext)
}

export { SocketContext, SocketContextProvider, useSocketContext }
