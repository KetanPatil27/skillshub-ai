"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how SkillsHub looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-muted-foreground">Select your preferred color theme.</div>
            </div>
            {mounted && (
              <div className="flex bg-muted rounded-md p-1">
                <Button variant={theme === "light" ? "secondary" : "ghost"} size="sm" onClick={() => setTheme("light")}>Light</Button>
                <Button variant={theme === "dark" ? "secondary" : "ghost"} size="sm" onClick={() => setTheme("dark")}>Dark</Button>
                <Button variant={theme === "system" ? "secondary" : "ghost"} size="sm" onClick={() => setTheme("system")}>System</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure your email and push notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">New Profile Submissions</div>
              <div className="text-sm text-muted-foreground">Receive an email when a new profile is submitted for review.</div>
            </div>
            <Button variant="outline">Enabled</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Weekly Digest</div>
              <div className="text-sm text-muted-foreground">Receive a weekly summary of skill analytics.</div>
            </div>
            <Button variant="outline">Disabled</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
