"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";
import { Upload, FileText } from "lucide-react";

interface UploadFromCSVProps {
    onSuccess?: () => void;
}

export default function UploadFromCSV({ onSuccess }: UploadFromCSVProps) {
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const loadingToast = toast.loading('Uploading CSV, Please Wait ...');
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/import/csv`, formData, {
                headers: {
                    Authorization: `Bearer ${session?.user?.token}`,
                },
            });
            toast.success("CSV imported successfully", { id: loadingToast });
            setFile(null);
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error("Failed to import CSV", { id: loadingToast });
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
                <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="pr-10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                    <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                )}
            </div>
            <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full sm:w-auto"
            >
                {isUploading ? (
                    <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV
                    </>
                )}
            </Button>
        </div>
    );
}