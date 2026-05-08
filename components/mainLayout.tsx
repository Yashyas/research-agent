import ChatNew from "./chat2";
import SourcesSection from "./sources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export default function MainLayout(){
    return(
       <div className="">
        <Tabs defaultValue="sources" className="w-full h-full flex flex-col lg:hidden ">
            <TabsList className="w-full px-4">
                <TabsTrigger  value="sources" className="data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground">Sources</TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground">ChatNew</TabsTrigger>
            </TabsList>
            <TabsContent value="sources"><SourcesSection/></TabsContent>
            <TabsContent value="chat"><ChatNew/></TabsContent>
        </Tabs>
        <div className="hidden lg:flex">
            <div className="flex-1/3"><SourcesSection/></div>
            <div className="flex-2/3"><ChatNew/></div>
        </div>

       </div> 
    )
}