import Image from "next/image"

export default function Home() {
    return <div>
        <div className="w-full container mx-auto">
            <div className="w-full flex items-center justify-between">
                <a className="flex items-center text-indigo-400 no-underline hover:no-underline font-bold text-2xl lg:text-4xl"
                   href="#">
                        <span
                            className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">Pauper</span>formance
                </a>

            </div>
        </div>

        <div
            className="container pt-12 md:pt-12 mx-auto flex">
            <div
                className="flex flex-col w-full xl:w-2/5 justify-center lg:items-start overflow-y-hidden">
                <h1 className="my-4 text-3xl md:text-5xl text-white opacity-75 font-bold leading-tight text-center md:text-left">
                    A common journey to optimal{" "}
                    <span
                        className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-pink-500 to-purple-500">
              Pauper
            </span>
                    .
                </h1>
            </div>

            <div className="w-full xl:w-3/5 p-12 overflow-hidden">
                <img className="mx-auto transform -rotate-6 transition hover:scale-55 duration-700 ease-in-out hover:rotate-6"
                    src="/cranial-plating.png"/>
            </div>
        </div>
    </div>
}
