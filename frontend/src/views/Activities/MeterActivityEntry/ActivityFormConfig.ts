import * as Yup from "yup";
import Dayjs from "dayjs";
import dayjs from "dayjs";
import {
  ActivityForm,
  ActivityFormControl,
  MeterListDTO,
  ObservationForm,
} from "@/interfaces";

// Form validation, these are applied to the current form when submitting
export const ActivityResolverSchema: Yup.ObjectSchema<any> = Yup.object()
  .shape({
    activity_details: Yup.object()
      .shape({
        selected_meter: Yup.object()
          .shape({
            id: Yup.number().required(),
          })
          .required("Please Select A Meter"),

        activity_type: Yup.object()
          .shape({
            id: Yup.number().required("Please Select An Activity"),
          })
          .required("Please Select An Activity"),

        user: Yup.object()
          .shape({
            id: Yup.number().required("Please Select A User"),
          })
          .required("Please Select a User"),

        date: Yup.date().required("Please Select a Date"),
        start_time: Yup.date().required("Please Select a Start Time"),
        end_time: Yup.date().required("Please Select an End Time"),
      })
      .required(),

    current_installation: Yup.object().when(
      "activity_details.activity_type.id",
      {
        is: 1,
        then: (schema) =>
          schema.shape({
            meter: Yup.object().shape({
              id: Yup.number(),
            }),
            well: Yup.object()
              .shape({
                id: Yup.number().required("Please select a well."),
              })
              .required("Please select a well."),
          }),
        otherwise: (schema) =>
          schema.shape({
            meter: Yup.object().shape({
              id: Yup.number(),
            }),
            well: Yup.object()
              .shape({
                id: Yup.number().notRequired(),
              })
              .notRequired(),
          }),
      },
    ),

    observations: Yup.array()
      .of(
        Yup.object().shape({
          time: Yup.date().required(),
          reading: Yup.number()
            .typeError("Please enter a number.")
            .min(0, "Please enter a non-negative value.")
            .required("Please enter a value."),
          property_type_id: Yup.number()
            .typeError("Please select a property type.")
            .required("Please select a property type."),
          unit_id: Yup.number()
            .typeError("Please select a unit.")
            .required("Please select a unit."),
        }),
      )
      .required(),
  })
  .required();

// Convert the form control to the format expected by the backend
export function toSubmissionForm(activityFormControl: ActivityFormControl) {
  const formData = new FormData();
  var observationForms: ObservationForm[] = [];

  activityFormControl.observations.forEach((observation: any) => {
    observationForms.push({
      time: observation.time,
      reading: observation.reading,
      property_type_id: observation.property_type_id ?? "",
      unit_id: observation.unit_id ?? "",
    });
  });

  const activityForm: ActivityForm = {
    activity_details: {
      meter_id: activityFormControl?.activity_details?.selected_meter?.id,
      activity_type_id:
        activityFormControl?.activity_details?.activity_type?.id,
      user_id: activityFormControl?.activity_details?.user?.id,
      date: activityFormControl?.activity_details?.date,
      start_time: activityFormControl?.activity_details?.start_time,
      end_time: activityFormControl?.activity_details?.end_time,
      share_ose: activityFormControl?.activity_details?.share_ose,
      work_order_id:
        activityFormControl?.activity_details?.work_order_id == null
          ? undefined
          : activityFormControl?.activity_details?.work_order_id,
    },
    current_installation: {
      contact_name: activityFormControl?.current_installation?.meter
        ?.contact_name as string,
      contact_phone: activityFormControl?.current_installation?.meter
        ?.contact_phone as string,
      well_id: activityFormControl?.current_installation?.well?.id,
      notes: activityFormControl?.current_installation?.meter?.notes as string,
      water_users: activityFormControl?.current_installation?.meter
        ?.water_users as string,
      meter_owner: activityFormControl?.current_installation?.meter
        ?.meter_owner as string,
    },
    observations: observationForms,
    maintenance_repair: {
      service_type_ids:
        activityFormControl.maintenance_repair?.service_type_ids ?? [],
      description: activityFormControl.maintenance_repair?.description ?? "",
    },
    notes: {
      working_on_arrival_slug:
        activityFormControl.notes.working_on_arrival_slug,
      selected_note_ids: activityFormControl.notes.selected_note_ids ?? [],
    },
    part_used_ids: activityFormControl.part_used_ids ?? [],
  };

  formData.append("activity", JSON.stringify(activityForm));

  activityFormControl.photos?.forEach((file: File) => {
    formData.append("photos", file);
  });

  return formData;
}

// Provides the default values of the activity form
export function getDefaultForm(
  initialMeter: Partial<MeterListDTO> | null,
  initialWorkOrderID: number | null = null,
): ActivityFormControl {
  //Generate start and end times using current time and end time 15min later
  const start_time = Dayjs();
  const end_time = Dayjs().add(15, "minute");

  const defaultForm: ActivityFormControl = {
    activity_details: {
      selected_meter: initialMeter,
      activity_type: null,
      user: null,
      date: Dayjs(),
      start_time: start_time,
      end_time: end_time,
      share_ose: initialWorkOrderID ? true : false,
      work_order_id: initialWorkOrderID,
    },

    current_installation: {
      meter: null,
      well: null,
    },

    // These should come from DB
    observations: [
      {
        time: dayjs.utc(),
        reading: "",
        property_type_id: 1,
        unit_id: 1,
      },
      {
        time: dayjs.utc(),
        reading: "",
        property_type_id: 2,
        unit_id: 3,
      },
      {
        time: dayjs.utc(),
        reading: "",
        property_type_id: 7,
        unit_id: 11,
      },
      {
        time: dayjs.utc(),
        reading: "",
        property_type_id: 3,
        unit_id: 5,
      },
    ],
    notes: {
      working_on_arrival_slug: "not-checked",
      selected_note_ids: [],
    },
  };

  return defaultForm;
}
