import { formatQueryParams } from "@/utils";
import { ST2Measurement, ST2Response } from "@/interfaces";

export const useFetchST2 = () => {
  const ST2_API_BASE_URL =
    "https://st2.newmexicowaterdata.org/FROST-Server/v1.1";

  return async (
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    route: string,
    params: Record<string, any> = {},
    body?: any,
  ) => {
    const starting_year = new Date().getFullYear() - 5;

    const queryParams = formatQueryParams({
      $filter: `year(phenomenonTime) gt ${starting_year}`,
      $orderby: "phenomenonTime asc",
      ...params,
    });

    let st2Measurements: ST2Measurement[] = [];
    let url = `${ST2_API_BASE_URL}${route}${queryParams}`;
    let count = 0;

    try {
      do {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body:
            body && ["POST", "PUT", "DELETE"].includes(method)
              ? JSON.stringify(body)
              : undefined,
        });

        if (!response.ok) {
          throw new Error(
            `[ERROR] HTTP Status: ${response.status} - ${response.statusText}`,
          );
        }

        const st2Response: ST2Response = await response.json();
        st2Measurements.push(...st2Response.value);
        url = st2Response["@iot.nextLink"];

        count++;
        if (count >= 20) {
          console.warn(
            `Warning: Loop limit reached while fetching ST2 data. Data may be incomplete.`,
          );
          break;
        }
      } while (url);

      return st2Measurements;
    } catch (error) {
      console.error("Error fetching ST2 data:", error);
      throw error;
    }
  };
};
