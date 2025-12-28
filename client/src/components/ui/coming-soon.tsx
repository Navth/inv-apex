import { Mail, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ComingSoonProps = {
	product?: string;
	eta?: string;
	description?: string;
	onNotifyClick?: () => void;
};

export function ComingSoon({
	product = "This feature",
	eta = "Coming soon",
	description = "We are polishing the final touches.",
}: ComingSoonProps) {
	return (
		<div className="min-h-[60vh] w-full flex items-center justify-center px-4 py-12">
			<Card className="w-full max-w-3xl overflow-hidden shadow-xl border-0 bg-white text-slate-900">
				<CardContent className="flex flex-col gap-8 p-10">
					<div className="flex items-center gap-3 text-slate-500">
						<div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
							<Rocket className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.3em] text-slate-400">Coming soon</p>
							<p className="font-semibold text-lg">{product}</p>
						</div>
					</div>

					<div className="space-y-4">
						<h1 className="text-4xl font-bold leading-tight text-slate-900">{eta}</h1>
						<p className="text-base text-slate-600 max-w-2xl">{description}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default ComingSoon;
