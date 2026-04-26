// components/SourcesSection.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText, MonitorPlay, Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSourceStore } from "@/lib/store/useSourceStore";

export default function SourcesSection() {
  const { sourceList, addSource, removeSource } = useSourceStore();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const handleAddYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    addSource({ type: "youtube", title: youtubeUrl, url: youtubeUrl });
    setYoutubeUrl("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      addSource({ type: "pdf", title: file.name, file });
      // Reset input so the same file can be uploaded again if deleted
      e.target.value = "";
    }
  };

  const confirmDelete = () => {
    if (sourceToDelete) {
      removeSource(sourceToDelete);
      setSourceToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 text-foreground bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Uploader Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-2.5">
              <Label
                htmlFor="pdf-upload"
                className="text-muted-foreground text-sm"
              >
                Select a PDF file
              </Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="cursor-pointer file:text-foreground file:bg-muted file:border-0 file:rounded-md hover:file:bg-muted/80 bg-background border-input file:px-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* YouTube URL Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <MonitorPlay className="w-5 h-5" />
              Add Media Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddYoutube} className="flex gap-3">
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="bg-background border-input flex-1"
                required
              />
              <Button type="submit" variant="default">
                <Plus className="w-4 h-4 mr-1.5" /> Add
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sources List */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Ingested Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceList.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
              No sources added yet. Upload a PDF or add a YouTube link to get
              started.
            </p>
          ) : (
            <ul className="space-y-3">
              {sourceList.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {source.type === "pdf" ? (
                      <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <MonitorPlay className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate text-foreground">
                      {source.title}
                    </span>
                  </div>

                  {/* Full Page Delete Confirmation Dialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                        onClick={() => setSourceToDelete(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>

                    {/* Full page layout overrides applied to content */}

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete your source {source.type}: {source.title}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel >Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
