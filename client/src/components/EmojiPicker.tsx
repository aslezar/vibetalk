import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { SmileIcon } from "lucide-react"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"
import { useTheme } from "../context/ThemeContext"

interface EmojiPickerProps {
    onChange: (value: string) => void
}
const EmojiPicker = ({ onChange }: EmojiPickerProps) => {
    const { theme } = useTheme()

    return (
        <Popover>
            <PopoverTrigger>
                <SmileIcon className="h-5 w-5" />
            </PopoverTrigger>
            <PopoverContent className="w-full">
                <Picker
                    emojiSize={18}
                    theme={theme}
                    data={data}
                    maxFrequentRows={1}
                    onEmojiSelect={(emoji: any) => onChange(emoji.native)}
                />
            </PopoverContent>
        </Popover>
    )
}

export default EmojiPicker