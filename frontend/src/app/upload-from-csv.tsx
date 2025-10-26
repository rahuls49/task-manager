"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";

export default function UploadFromCSV() {
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a CSV file");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const loadingToast = toast.loading('Uploading CSV, Please Wait ...');
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/import/csv`, formData, {
                headers: {
                    Authorization: `Bearer ${session?.user?.token}`,
                },
            });
            toast.success("CSV imported successfully", {id: loadingToast});
            setFile(null);
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            toast.error("Failed to import CSV", {id: loadingToast});
            console.error(error);
        }
    };

    return (
        <header className="flex justify-end gap-2 items-center">
            <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="max-w-xs"
            />
            <Button onClick={handleUpload} disabled={!file}>
                Upload From CSV
            </Button>
        </header>
    );
}