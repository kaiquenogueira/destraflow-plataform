import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateForm } from "@/components/templates/template-form";

export default function NewTemplatePage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Novo Template</CardTitle>
                </CardHeader>
                <CardContent>
                    <TemplateForm />
                </CardContent>
            </Card>
        </div>
    );
}
