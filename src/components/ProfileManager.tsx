import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Edit2, CheckCircle } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ResumeData {
  name?: string;
  email?: string;
  experience?: string;
  skills?: string[];
  summary?: string;
  education?: string;
  achievements?: string[];
}

interface ProfileManagerProps {
  onProfileUpdate: (resumeData: ResumeData | null) => void;
}

export const ProfileManager = ({ onProfileUpdate }: ProfileManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData>({
    name: "",
    email: "",
    experience: "",
    skills: [],
    summary: "",
    education: "",
    achievements: []
  });

  const [formData, setFormData] = useState<ResumeData>({});

  // Load profile data on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('resume_data, full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const resumeDataObj = data.resume_data as any;
        const profileData = {
          name: data.full_name || "",
          email: data.email || user.email || "",
          experience: resumeDataObj?.experience || "",
          skills: resumeDataObj?.skills || [],
          summary: resumeDataObj?.summary || "",
          education: resumeDataObj?.education || "",
          achievements: resumeDataObj?.achievements || []
        };
        
        setResumeData(profileData);
        setFormData(profileData);
        onProfileUpdate(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name,
          email: formData.email,
          resume_data: {
            experience: formData.experience,
            skills: formData.skills,
            summary: formData.summary,
            education: formData.education,
            achievements: formData.achievements
          }
        });

      if (error) throw error;

      setResumeData(formData);
      setIsEditing(false);
      onProfileUpdate(formData);
      
      toast({
        title: "Profile saved!",
        description: "Your profile information has been updated successfully."
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "There was an issue saving your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkillsChange = (value: string) => {
    const skills = value.split(',').map(skill => skill.trim()).filter(Boolean);
    setFormData({ ...formData, skills });
  };

  const handleAchievementsChange = (value: string) => {
    const achievements = value.split('\n').filter(Boolean);
    setFormData({ ...formData, achievements });
  };

  const hasData = resumeData.name || resumeData.experience || resumeData.skills?.length || resumeData.summary;

  if (!hasData && !isEditing) {
    return (
      <Card className="p-6 border-tech-border bg-surface">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-tech-accent" />
          <h3 className="font-medium text-tech-primary mb-2">Create Your Profile</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your professional information to generate more personalized LinkedIn posts
          </p>
          <Button 
            onClick={() => setIsEditing(true)}
            className="btn-primary"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Create Profile
          </Button>
        </div>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card className="p-6 border-tech-border bg-surface">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-tech-primary">Edit Profile</h3>
            <CheckCircle className="h-5 w-5 text-tech-accent" />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary || ""}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief overview of your professional background..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience || ""}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Current role, company, years of experience..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={formData.skills?.join(', ') || ""}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="JavaScript, React, Node.js, Python..."
              />
            </div>

            <div>
              <Label htmlFor="education">Education</Label>
              <Textarea
                id="education"
                value={formData.education || ""}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="Degree, university, graduation year..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="achievements">Key Achievements (one per line)</Label>
              <Textarea
                id="achievements"
                value={formData.achievements?.join('\n') || ""}
                onChange={(e) => handleAchievementsChange(e.target.value)}
                placeholder="Led team of 5 developers&#10;Increased conversion rate by 25%&#10;Published 3 research papers"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="btn-primary flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                setFormData(resumeData);
              }}
              className="btn-outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-tech-border bg-surface">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-tech-primary">Your Profile</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(true)}
            className="btn-ghost-tech"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="space-y-3 text-sm">
          {resumeData.name && (
            <div>
              <span className="font-medium text-tech-accent">Name:</span>
              <p className="text-muted-foreground">{resumeData.name}</p>
            </div>
          )}
          
          {resumeData.summary && (
            <div>
              <span className="font-medium text-tech-accent">Summary:</span>
              <p className="text-muted-foreground">{resumeData.summary}</p>
            </div>
          )}
          
          {resumeData.experience && (
            <div>
              <span className="font-medium text-tech-accent">Experience:</span>
              <p className="text-muted-foreground">{resumeData.experience}</p>
            </div>
          )}
          
          {resumeData.skills && resumeData.skills.length > 0 && (
            <div>
              <span className="font-medium text-tech-accent">Skills:</span>
              <p className="text-muted-foreground">{resumeData.skills.join(', ')}</p>
            </div>
          )}
          
          {resumeData.education && (
            <div>
              <span className="font-medium text-tech-accent">Education:</span>
              <p className="text-muted-foreground">{resumeData.education}</p>
            </div>
          )}
          
          {resumeData.achievements && resumeData.achievements.length > 0 && (
            <div>
              <span className="font-medium text-tech-accent">Achievements:</span>
              <ul className="text-muted-foreground list-disc list-inside ml-2">
                {resumeData.achievements.map((achievement, index) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};