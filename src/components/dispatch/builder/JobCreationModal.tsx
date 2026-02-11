'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { JobCreationContent } from '@/components/jobs/JobCreationContent'

interface JobCreationModalProps {
    onClose?: () => void
    onSave?: (job: any) => void
    defaultOpen?: boolean
    trigger?: React.ReactNode
}

export function JobCreationModal({ onClose, onSave, defaultOpen, trigger }: JobCreationModalProps) {
    const [open, setOpen] = useState(defaultOpen || false)

    const handleSave = (newJob: any) => {
        if (onSave) onSave(newJob)
        setOpen(false)
        if (onClose) onClose()
    }

    const handleCancel = () => {
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
        }}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-white p-0 gap-0 outline-none">
                <DialogHeader className="px-6 py-4 bg-white border-b shrink-0">
                    <DialogTitle>Create New Job</DialogTitle>
                    <DialogDescription className="sr-only">
                        Form to create a new job and assign it to a driver.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <JobCreationContent
                        onSave={handleSave}
                        onCancel={handleCancel}
                        variant="modal"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
