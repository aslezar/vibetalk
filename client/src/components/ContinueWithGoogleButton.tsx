/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { loginGoogle } from "../features/userSlice"
import { useAppDispatch, useAppSelector } from "../hooks"
import { useNavigate } from "react-router-dom"
import { useTheme, Theme } from "@/context/ThemeContext"

const ContinueWithGoogleButton = () => {
    const { isAuthenticated, loading } = useAppSelector((state) => state.user)

    const navigate = useNavigate()
    const dispatch = useAppDispatch()

    const { theme } = useTheme()
    let isDark = theme === Theme.Dark
    if (theme === "system") {
        const systemTheme = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches
        if (systemTheme) isDark = true
    }

    React.useEffect(() => {
        const googleDataCallback = (res: any) => {
            dispatch(loginGoogle(res.credential))
        }
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        document.body.appendChild(script)
        ;(window as any).continueWithGoogle = googleDataCallback

        return () => {
            document.body.removeChild(script)
            ;(window as any).continueWithGoogle = null
        }
    }, [dispatch, isDark])

    React.useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/")
        }
    }, [loading, isAuthenticated, navigate])

    return (
        <div className="flex flex-col items-center justify-center w-full gap-4">
            <div
                id="g_id_onload"
                data-client_id={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                data-context="use"
                data-ux_mode="popup"
                data-callback="continueWithGoogle"
                data-itp_support="true"
            ></div>
            <div
                className="g_id_signin"
                data-type="standard"
                data-shape="circle"
                data-theme={isDark ? "filled_black" : "filled_blue"}
                data-text="continue_with"
                data-size="large"
                data-logo_alignment="left"
                data-width="300"
            ></div>
        </div>
    )
}

export default ContinueWithGoogleButton
