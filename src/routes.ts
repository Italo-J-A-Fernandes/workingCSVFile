import { Request, Response, Router } from "express";
import { Readable } from "stream";
import { client } from "./database/client";
import readLine from "readline";
import multer from "multer";

const multerConfig = multer();
const router = Router();

interface Product {
  code_bar: string;
  description: string;
  price: number;
  quantity: number;
}

router.get("/", (request: Request, response: Response) => {
  return response.send("Aplicação ok!");
});

router.post(
  "/products",
  multerConfig.single("file"),
  async (request: Request, response: Response) => {
    const { file } = request;
    const bufferFile = file?.buffer;

    const readableFile = new Readable();
    readableFile.push(bufferFile);
    readableFile.push(null);

    const productsLine = readLine.createInterface({
      input: readableFile,
    });

    const products: Product[] = [];

    for await (let line of productsLine) {
      const productsLineSplit = line.split(",");

      const exist = products.findIndex(
        (prod) => prod.code_bar === productsLineSplit[0]
      );

      if (exist === -1) {
        products.push({
          code_bar: productsLineSplit[0],
          description: productsLineSplit[1],
          price: Number(productsLineSplit[2]),
          quantity: Number(productsLineSplit[3]),
        });
      }
    }

    await client.products
      .createMany({
        data: products,
        skipDuplicates: true,
      })
      .then((resp) => {
        console.log(resp);
        if (resp.count === 0) {
          return response.status(200).json({
            message: "Os dados enviados já encontram-se registrados no banco.",
          });
        }
        return response.status(200).json({
          message: `${resp.count} cadastros realizados com sucesso!`,
        });
      })
      .catch((error) => {
        console.log("Message", error.message);
        return response.status(500).json({
          message: "Não foi possivel realizar os cadastros!",
        });
      });
  }
);

export { router };
